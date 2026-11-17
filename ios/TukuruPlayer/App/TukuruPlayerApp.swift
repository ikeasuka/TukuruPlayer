import SwiftUI

@main
struct TukuruPlayerApp: App {
    @StateObject private var library: GameLibrary

    init() {
        AppSettings.registerDefaults()
        _library = StateObject(wrappedValue: GameLibrary())
    }

    var body: some Scene {
        WindowGroup {
            LibraryView()
                .environmentObject(library)
        }
    }
}
