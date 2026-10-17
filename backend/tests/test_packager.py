import os
import tempfile
import pytest
from app.core.packager import IntuneWinPackager

def test_package_and_unpack():
    with tempfile.TemporaryDirectory() as td:
        sample_file = os.path.join(td, "setup_test.exe")
        sample_content = b"TEST_BINARY_EXE_DATA_FOR_INTUNEWIN_VALIDATION"
        with open(sample_file, "wb") as f:
            f.write(sample_content)

        output_pkg = os.path.join(td, "output.intunewin")
        meta = IntuneWinPackager.package_file(sample_file, output_pkg)

        assert os.path.exists(output_pkg)
        assert meta["unencrypted_size"] == len(sample_content)
        assert meta["encrypted_size"] > 0
        assert "encryptionKey" in meta["encryption_info"]
        assert "mac" in meta["encryption_info"]
        assert "ProfileVersion1" == meta["encryption_info"]["profileIdentifier"]

        # Verify unpacking & HMAC
        unpack_dir = os.path.join(td, "unpacked")
        result = IntuneWinPackager.unpack_and_verify(output_pkg, unpack_dir)
        assert result["verified"] is True
        assert result["size"] == len(sample_content)

        with open(result["setup_file"], "rb") as f:
            unpacked_content = f.read()
        assert unpacked_content == sample_content
