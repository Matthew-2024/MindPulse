import SwiftUI

@main
struct MindPulseSwiftUIApp: App {
    @StateObject private var store = MindPulseStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
        }
    }
}
