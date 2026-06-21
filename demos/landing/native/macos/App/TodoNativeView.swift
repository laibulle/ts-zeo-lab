import SwiftUI

struct TodoNativeView: View {
    @EnvironmentObject private var model: TodoNativeModel
    @State private var draft = ""

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.06, green: 0.07, blue: 0.08),
                    Color(red: 0.11, green: 0.13, blue: 0.16)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            HStack(spacing: 0) {
                sidebar
                content
            }
        }
        .frame(minWidth: 920, minHeight: 620)
    }

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 10) {
                Text("@ts-zero")
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .foregroundStyle(.secondary)

                Text("Todo Native")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)

                Text("SwiftUI shell, JavaScriptCore runtime, native capabilities.")
                    .font(.system(size: 14))
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 12) {
                StatTile(label: "Total", value: model.stats.total)
                StatTile(label: "Open", value: model.stats.remaining)
                StatTile(label: "Done", value: model.stats.completed)
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("Host activity")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)

                ForEach(model.log, id: \.self) { entry in
                    Text(entry)
                        .font(.system(size: 12, design: .monospaced))
                        .lineLimit(1)
                        .truncationMode(.middle)
                        .foregroundStyle(.white.opacity(0.72))
                }
            }

            Spacer()

            Text(model.status)
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(Color(red: 0.47, green: 0.96, blue: 0.74))
                .lineLimit(2)
        }
        .padding(28)
        .frame(width: 300)
        .background(Color.black.opacity(0.28))
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 10) {
                TextField("Add a native todo", text: $draft)
                    .textFieldStyle(.plain)
                    .font(.system(size: 18, weight: .medium))
                    .padding(.horizontal, 16)
                    .frame(height: 52)
                    .background(Color.white.opacity(0.92))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .onSubmit(createTodo)

                Button(action: createTodo) {
                    Image(systemName: "plus")
                        .font(.system(size: 18, weight: .bold))
                        .frame(width: 52, height: 52)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.black)
                .background(Color(red: 0.52, green: 0.95, blue: 0.67))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(model.todos) { todo in
                        TodoRow(todo: todo)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .padding(32)
    }

    private func createTodo() {
        let title = draft.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !title.isEmpty else {
            return
        }

        model.createTodo(title: title)
        draft = ""
    }
}

private struct StatTile: View {
    let label: String
    let value: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(value)")
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private struct TodoRow: View {
    @EnvironmentObject private var model: TodoNativeModel
    let todo: TodoItem

    var body: some View {
        HStack(spacing: 14) {
            Button {
                model.toggleTodo(todo)
            } label: {
                Image(systemName: todo.completed ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(todo.completed ? Color(red: 0.52, green: 0.95, blue: 0.67) : .white.opacity(0.55))
            }
            .buttonStyle(.plain)

            Text(todo.title)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(todo.completed ? .white.opacity(0.45) : .white)
                .strikethrough(todo.completed)

            Spacer()

            Button {
                model.deleteTodo(todo)
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.5))
                    .frame(width: 34, height: 34)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .frame(height: 64)
        .background(Color.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
