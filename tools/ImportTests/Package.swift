// swift-tools-version:5.9
// Unit tests for the game import logic (ios/TukuruPlayer/Library/GameImporter.swift).
// Run on macOS: cd tools/ImportTests && swift test
import PackageDescription

let package = Package(
    name: "ImportTests",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(url: "https://github.com/weichsel/ZIPFoundation.git", from: "0.9.19"),
    ],
    targets: [
        .target(name: "TKRImport", dependencies: ["ZIPFoundation"], path: "Sources/TKRImport"),
        .testTarget(name: "TKRImportTests", dependencies: ["TKRImport"], path: "Tests/TKRImportTests",
                    resources: [.copy("Fixtures")]),
    ]
)
