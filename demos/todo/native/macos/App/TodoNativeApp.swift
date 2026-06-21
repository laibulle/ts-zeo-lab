import SwiftUI

@main
struct TodoNativeApp: App {
    @StateObject private var model = TodoNativeModel()

    var body: some Scene {
        WindowGroup {
            TodoNativeView()
                .environmentObject(model)
                .task {
                    model.start()
                }
        }
        .windowStyle(.hiddenTitleBar)
    }
}
