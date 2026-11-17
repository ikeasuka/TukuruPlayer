import SwiftUI

@main
struct TukuruPlayerApp: App {
    @StateObject private var library: GameLibrary

    init() {
        Settings.registerDefaults()
        _library = StateObject(wrappedValue: GameLibrary())
    }

    var body: some Scene {
        WindowGroup {
            LibraryView()
                .environmentObject(library)
        }
    }
}
