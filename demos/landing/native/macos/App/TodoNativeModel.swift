import AppKit
import Foundation
import JavaScriptCore

struct TodoItem: Identifiable, Equatable {
    let id: String
    var title: String
    var completed: Bool
}

struct TodoStats: Equatable {
    var total: Int = 0
    var completed: Int = 0
    var remaining: Int = 0
}

@MainActor
final class TodoNativeModel: ObservableObject {
    @Published var todos: [TodoItem] = []
    @Published var stats = TodoStats()
    @Published var status = "Starting JavaScriptCore"
    @Published var log: [String] = []

    private var host: TodoNativeHost?

    func start() {
        guard host == nil else {
            return
        }

        do {
            let host = try TodoNativeHost(
                onEvent: { [weak self] name, payload in
                    Task { @MainActor in
                        self?.handleEvent(name: name, payload: payload)
                    }
                },
                onLog: { [weak self] message in
                    Task { @MainActor in
                        self?.appendLog(message)
                    }
                }
            )
            self.host = host
            try host.start()
            status = "Native channel online"
        } catch {
            status = "Failed to start runtime"
            appendLog("host.error \(error)")
        }
    }

    func createTodo(title: String) {
        host?.sendEvent(name: "todo.create", payload: [
            "title": title
        ])
    }

    func toggleTodo(_ todo: TodoItem) {
        host?.sendEvent(name: "todo.toggle", payload: [
            "id": todo.id
        ])
    }

    func deleteTodo(_ todo: TodoItem) {
        host?.sendEvent(name: "todo.delete", payload: [
            "id": todo.id
        ])
    }

    private func handleEvent(name: String, payload: [String: Any]?) {
        switch name {
        case "todos.changed":
            updateTodos(payload)
        case "native.status":
            if let text = payload?["text"] as? String {
                status = text
            }
        case "demo.started":
            appendLog("js.event \(name)")
        default:
            appendLog("js.event \(name)")
        }
    }

    private func updateTodos(_ payload: [String: Any]?) {
        let rawTodos = payload?["todos"] as? [[String: Any]] ?? []

        todos = rawTodos.compactMap { raw in
            guard let id = raw["id"] as? String,
                  let title = raw["title"] as? String,
                  let completed = raw["completed"] as? Bool else {
                return nil
            }

            return TodoItem(id: id, title: title, completed: completed)
        }

        if let rawStats = payload?["stats"] as? [String: Any] {
            stats = TodoStats(
                total: rawStats["total"] as? Int ?? todos.count,
                completed: rawStats["completed"] as? Int ?? todos.filter(\.completed).count,
                remaining: rawStats["remaining"] as? Int ?? todos.filter { !$0.completed }.count
            )
        }
    }

    private func appendLog(_ message: String) {
        log.insert(message, at: 0)

        if log.count > 8 {
            log.removeLast(log.count - 8)
        }
    }
}

final class TodoNativeHost {
    private let context: JSContext
    private let onEvent: (String, [String: Any]?) -> Void
    private let onLog: (String) -> Void

    init(
        onEvent: @escaping (String, [String: Any]?) -> Void,
        onLog: @escaping (String) -> Void
    ) throws {
        guard let context = JSContext() else {
            throw HostError.failedToCreateContext
        }

        self.context = context
        self.onEvent = onEvent
        self.onLog = onLog
        installHostFunctions()
        try evaluateRuntime()
    }

    func start() throws {
        try invokeRuntime(method: "start", arguments: [])
    }

    func sendEvent(name: String, payload: [String: Any]) {
        sendToJavaScript([
            "kind": "event",
            "name": name,
            "payload": payload
        ])
    }

    private func installHostFunctions() {
        context.exceptionHandler = { [onLog] _, exception in
            if let exception {
                onLog("javascript.exception \(exception)")
            }
        }

        let nativeLog: @convention(block) (String) -> Void = { [onLog] message in
            onLog(message)
        }

        let nativeSend: @convention(block) (String) -> Void = { [weak self] message in
            self?.receiveFromJavaScript(message)
        }

        context.setObject(nativeLog, forKeyedSubscript: "nativeLog" as NSString)
        context.setObject(nativeSend, forKeyedSubscript: "nativeSend" as NSString)
    }

    private func evaluateRuntime() throws {
        guard let url = Bundle.main.url(forResource: "runtime", withExtension: "js") else {
            throw HostError.missingRuntime
        }

        let source = try String(contentsOf: url, encoding: .utf8)
        context.evaluateScript(source, withSourceURL: url)

        if let exception = context.exception {
            throw HostError.javascriptException(String(describing: exception))
        }
    }

    private func receiveFromJavaScript(_ json: String) {
        guard let message = decode(json),
              let kind = message["kind"] as? String else {
            onLog("host.error invalid-message")
            return
        }

        switch kind {
        case "event":
            handleEvent(message)
        case "request":
            handleRequest(message)
        default:
            onLog("host.error unknown-kind \(kind)")
        }
    }

    private func handleEvent(_ message: [String: Any]) {
        guard let name = message["name"] as? String else {
            onLog("host.error missing-event-name")
            return
        }

        onEvent(name, message["payload"] as? [String: Any])
    }

    private func handleRequest(_ message: [String: Any]) {
        guard let id = message["id"] as? String,
              let capability = message["capability"] as? String,
              let operation = message["operation"] as? String else {
            onLog("host.error malformed-request")
            return
        }

        onLog("native.request \(capability).\(operation)")

        switch (capability, operation) {
        case ("secureStorage", "set"):
            sendToJavaScript([
                "kind": "response",
                "id": id,
                "ok": true,
                "value": [
                    "saved": true,
                    "backend": "macOS.Keychain.demo"
                ]
            ])
        case ("haptics", "success"):
            NSHapticFeedbackManager.defaultPerformer.perform(.alignment, performanceTime: .default)
            sendToJavaScript([
                "kind": "response",
                "id": id,
                "ok": true,
                "value": [
                    "played": true
                ]
            ])
        default:
            sendToJavaScript([
                "kind": "response",
                "id": id,
                "ok": false,
                "error": "Unsupported capability operation: \(capability).\(operation)"
            ])
        }
    }

    private func sendToJavaScript(_ message: [String: Any]) {
        guard let json = encode(message) else {
            onLog("host.error encode-message")
            return
        }

        context.objectForKeyedSubscript("TsZeroTodoNative")
            .invokeMethod("receive", withArguments: [json])
    }

    private func invokeRuntime(method: String, arguments: [Any]) throws {
        let runtime = context.objectForKeyedSubscript("TsZeroTodoNative")

        guard let runtime, !runtime.isUndefined else {
            throw HostError.missingRuntimeGlobal
        }

        runtime.invokeMethod(method, withArguments: arguments)

        if let exception = context.exception {
            throw HostError.javascriptException(String(describing: exception))
        }
    }

    private func decode(_ json: String) -> [String: Any]? {
        guard let data = json.data(using: .utf8),
              let value = try? JSONSerialization.jsonObject(with: data),
              let object = value as? [String: Any] else {
            return nil
        }

        return object
    }

    private func encode(_ value: [String: Any]) -> String? {
        guard JSONSerialization.isValidJSONObject(value),
              let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]) else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }
}

enum HostError: Error {
    case failedToCreateContext
    case javascriptException(String)
    case missingRuntime
    case missingRuntimeGlobal
}
