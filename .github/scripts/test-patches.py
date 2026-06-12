#!/usr/bin/env python3
"""Quick local test for Gradle patch scripts (no bash required)."""
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = Path(__file__).resolve().parent / "fixtures"


def extract_py(script_path: Path) -> str:
    text = script_path.read_text()
    return text.split("<<'PY'")[1].split("PY")[0]


def test_signing() -> None:
    work = Path(tempfile.mkdtemp())
    android = work / "android"
    app = android / "app"
    app.mkdir(parents=True)
    shutil.copy(FIXTURES / "app.build.gradle.template", app / "build.gradle")
    (android / "key.properties").write_text(
        "storeFile=../keystore.jks\nstorePassword=t\nkeyAlias=t\nkeyPassword=t\n"
    )
    (android / "keystore.jks").write_bytes(b"x")

    py = extract_py(Path(__file__).parent / "configure-android-signing.sh")
    sys.argv = ["", str(app / "build.gradle")]
    exec(py, {"__name__": "__main__"})

    gradle = (app / "build.gradle").read_text()
    assert gradle.index("def keystorePropertiesFile") < gradle.index("android {")
    assert gradle.index("buildTypes {") < gradle.index("signingConfig signingConfigs.release")
    print("signing OK")


def test_android_version() -> None:
    work = Path(tempfile.mkdtemp())
    android = work / "android"
    app = android / "app"
    app.mkdir(parents=True)
    shutil.copy(FIXTURES / "app.build.gradle.template", app / "build.gradle")
    package_json = work / "package.json"
    package_json.write_text('{"version":"3.1.4"}\n')

    py = extract_py(Path(__file__).parent / "sync-android-version.sh")
    sys.argv = ["", str(package_json), str(app / "build.gradle")]
    exec(py, {"__name__": "__main__"})

    gradle = (app / "build.gradle").read_text()
    assert 'versionName "3.1.4"' in gradle
    assert "versionCode 30104" in gradle
    print("android version OK")


def test_firebase() -> None:
    work = Path(tempfile.mkdtemp())
    android = work / "android"
    app = android / "app"
    app.mkdir(parents=True)
    shutil.copy(FIXTURES / "app.build.gradle.template", app / "build.gradle")
    shutil.copy(FIXTURES / "root.build.gradle.template", android / "build.gradle")

    py = extract_py(Path(__file__).parent / "configure-android-firebase.sh")
    sys.argv = ["", str(android / "build.gradle"), str(app / "build.gradle")]
    exec(py, {"__name__": "__main__"})

    app_text = (app / "build.gradle").read_text()
    root_text = (android / "build.gradle").read_text()
    assert "firebase-crashlytics" in app_text
    assert "firebase-crashlytics-gradle" in root_text
    assert "google-services" not in app_text.split("try {")[0]
    print("firebase OK")


if __name__ == "__main__":
    test_signing()
    test_firebase()
    test_android_version()
    print("ALL OK")
