import XCTest
@testable import TKRImport

final class GameImporterTests: XCTestCase {
    var work: URL!

    override func setUpWithError() throws {
        work = FileManager.default.temporaryDirectory.appendingPathComponent("tkr-test-" + UUID().uuidString)
        try FileManager.default.createDirectory(at: work, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: work)
    }

    func fixture(_ name: String) throws -> URL {
        try XCTUnwrap(Bundle.module.url(forResource: name, withExtension: "zip", subdirectory: "Fixtures"))
    }

    func importZip(_ name: String) throws -> URL {
        let dest = work.appendingPathComponent("dest-" + name)
        try GameImporter.importGame(from: try fixture(name), to: dest)
        return dest
    }

    func exists(_ base: URL, _ rel: String) -> Bool {
        FileManager.default.fileExists(atPath: base.appendingPathComponent(rel).path)
    }

    func testShiftJISNestedZip() throws {
        let dest = try importZip("sjis_nested")
        XCTAssertTrue(exists(dest, "Game.ini"))
        XCTAssertTrue(exists(dest, "Data/Scripts.rvdata2"))
        XCTAssertTrue(exists(dest, "Graphics/Pictures/①タイトル.png"), GameImporter.summary(of: dest))
    }

    func testEncryptedArchiveWithoutDirectoryEntries() throws {
        let dest = try importZip("rgss3a_nodirs")
        XCTAssertTrue(exists(dest, "Game.rgss3a"))
        XCTAssertTrue(exists(dest, "Audio/BGM/戦闘.ogg"), GameImporter.summary(of: dest))
    }

    func testMacOSZip() throws {
        let dest = try importZip("macos_utf8")
        XCTAssertTrue(exists(dest, "Data/Scripts.rvdata"))
    }

    func testFlatBackslashZip() throws {
        let dest = try importZip("flat_backslash")
        XCTAssertTrue(exists(dest, "Data/Scripts.rvdata2"))
        XCTAssertTrue(exists(dest, "Graphics/System/Window.png"))
    }

    func testCustomArchiveNameDeep() throws {
        let dest = try importZip("custom_archive_deep")
        XCTAssertTrue(exists(dest, "MyGame.rgss3a"))
    }

    func testExeOnlyGivesHelpfulMessage() throws {
        XCTAssertThrowsError(try importZip("exe_only")) { error in
            let msg = (error as? LocalizedError)?.errorDescription ?? ""
            XCTAssertTrue(msg.contains(".exe"), msg)
            XCTAssertTrue(msg.contains("ゲーム.exe"), msg)
        }
    }

    func testZipSlipIsBlocked() throws {
        let dest = try importZip("zipslip")
        XCTAssertTrue(exists(dest, "Data/Scripts.rvdata2"))
        XCTAssertFalse(FileManager.default.fileExists(atPath: work.deletingLastPathComponent()
            .appendingPathComponent("evil.txt").path))
    }

    /// Regression: on iOS the temp folder is reported as /private/var/... while standardized
    /// paths of existing folders become /var/..., which made every ZIP entry look "outside".
    func testUnzipIntoPrivatePrefixedFolder() throws {
        var dir = work.appendingPathComponent("priv")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let real = dir.resolvingSymlinksInPath().path
        if !real.hasPrefix("/private/") && FileManager.default.fileExists(atPath: "/private" + real) {
            dir = URL(fileURLWithPath: "/private" + real)
        } else {
            dir = URL(fileURLWithPath: real)
        }
        XCTAssertTrue(dir.path.hasPrefix("/private/"), dir.path)
        try GameImporter.unzip(try fixture("rgss3a_nodirs"), to: dir)
        XCTAssertNotNil(GameImporter.findGameRoot(dir), GameImporter.summary(of: dir))
    }

    func testSafeComponents() {
        XCTAssertEqual(GameImporter.safeComponents("../a/./b\\..\\c"), ["a", "b", "c"])
    }

    func testFolderImport() throws {
        let src = work.appendingPathComponent("src/外側/ゲーム")
        try FileManager.default.createDirectory(at: src.appendingPathComponent("Data"), withIntermediateDirectories: true)
        try Data("x".utf8).write(to: src.appendingPathComponent("Data/Scripts.rvdata2"))
        let dest = work.appendingPathComponent("folder-dest")
        try GameImporter.importGame(from: work.appendingPathComponent("src"), to: dest)
        XCTAssertTrue(exists(dest, "Data/Scripts.rvdata2"))
    }
}
