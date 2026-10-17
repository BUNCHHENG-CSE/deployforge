import os
import io
import zipfile
import base64
import hashlib
import hmac
from typing import Dict, Any, Optional
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

def pad_pkcs7(data: bytes, block_size: int = 16) -> bytes:
    padding_len = block_size - (len(data) % block_size)
    return data + bytes([padding_len] * padding_len)

def unpad_pkcs7(data: bytes) -> bytes:
    if not data:
        return b""
    padding_len = data[-1]
    if padding_len < 1 or padding_len > 16:
        raise ValueError("Invalid PKCS7 padding")
    return data[:-padding_len]

class IntuneWinPackager:
    TOOL_VERSION = "1.8.5.0"

    @classmethod
    def package_file(cls, input_file_path: str, output_intunewin_path: str, setup_file_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Packages an installer file (.exe, .msi, etc.) into an authentic Microsoft .intunewin package.
        """
        if not os.path.exists(input_file_path):
            raise FileNotFoundError(f"Input file not found: {input_file_path}")

        setup_name = setup_file_name or os.path.basename(input_file_path)
        with open(input_file_path, "rb") as f:
            plaintext_data = f.read()

        unencrypted_size = len(plaintext_data)

        # 1. Calculate SHA-256 of plaintext
        hasher = hashlib.sha256()
        hasher.update(plaintext_data)
        file_digest = hasher.digest()
        file_digest_b64 = base64.b64encode(file_digest).decode("utf-8")

        # 2. Generate random cryptographic keys
        # AES-256 key (32 bytes)
        encryption_key = os.urandom(32)
        # HMAC-SHA256 key (32 bytes)
        mac_key = os.urandom(32)
        # AES IV (16 bytes)
        iv = os.urandom(16)

        # 3. Encrypt data using AES-256-CBC with PKCS7 padding
        padded_data = pad_pkcs7(plaintext_data, block_size=16)
        cipher = Cipher(algorithms.AES(encryption_key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        encrypted_data = encryptor.update(padded_data) + encryptor.finalize()
        encrypted_size = len(encrypted_data)

        # 4. Compute HMAC-SHA256 of the ciphertext
        hmac_obj = hmac.new(mac_key, encrypted_data, hashlib.sha256)
        mac = hmac_obj.digest()
        mac_b64 = base64.b64encode(mac).decode("utf-8")

        # 5. Base64 encode keys for metadata
        encryption_key_b64 = base64.b64encode(encryption_key).decode("utf-8")
        mac_key_b64 = base64.b64encode(mac_key).decode("utf-8")
        iv_b64 = base64.b64encode(iv).decode("utf-8")

        # 6. Build Detection.xml
        detection_xml = (
            f'<?xml version="1.0" encoding="utf-8"?>\n'
            f'<ApplicationInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ToolVersion="{cls.TOOL_VERSION}">\n'
            f'  <Name>{setup_name}</Name>\n'
            f'  <UnencryptedContentSize>{unencrypted_size}</UnencryptedContentSize>\n'
            f'  <FileName>{setup_name}</FileName>\n'
            f'  <SetupFile>{setup_name}</SetupFile>\n'
            f'  <EncryptionInfo>\n'
            f'    <EncryptionKey>{encryption_key_b64}</EncryptionKey>\n'
            f'    <MacKey>{mac_key_b64}</MacKey>\n'
            f'    <InitializationVector>{iv_b64}</InitializationVector>\n'
            f'    <Mac>{mac_b64}</Mac>\n'
            f'    <ProfileIdentifier>ProfileVersion1</ProfileIdentifier>\n'
            f'    <FileDigest>{file_digest_b64}</FileDigest>\n'
            f'    <FileDigestAlgorithm>SHA256</FileDigestAlgorithm>\n'
            f'  </EncryptionInfo>\n'
            f'</ApplicationInfo>'
        )

        manifest_b64 = base64.b64encode(detection_xml.encode("utf-8")).decode("utf-8")

        # 7. Create .intunewin (standard zip file)
        os.makedirs(os.path.dirname(os.path.abspath(output_intunewin_path)), exist_ok=True)
        with zipfile.ZipFile(output_intunewin_path, "w", zipfile.ZIP_DEFLATED) as zf:
            # Add Detection.xml
            zf.writestr("IntuneWinPackage/Metadata/Detection.xml", detection_xml.encode("utf-8"))
            # Add encrypted payload (in Intune standard, this entry is named <setup_file_name>.intunewin)
            zf.writestr(f"IntuneWinPackage/Contents/{setup_name}.intunewin", encrypted_data)

        return {
            "intunewin_path": output_intunewin_path,
            "setup_file_name": setup_name,
            "unencrypted_size": unencrypted_size,
            "encrypted_size": encrypted_size,
            "detection_xml": detection_xml,
            "manifest_base64": manifest_b64,
            "encryption_info": {
                "encryptionKey": encryption_key_b64,
                "macKey": mac_key_b64,
                "initializationVector": iv_b64,
                "mac": mac_b64,
                "profileIdentifier": "ProfileVersion1",
                "fileDigest": file_digest_b64,
                "fileDigestAlgorithm": "SHA256"
            }
        }

    @classmethod
    def unpack_and_verify(cls, intunewin_path: str, output_dir: str) -> Dict[str, Any]:
        """
        Verifies and unpacks an .intunewin file, validating HMAC and SHA-256.
        """
        import xml.etree.ElementTree as ET

        with zipfile.ZipFile(intunewin_path, "r") as zf:
            detection_xml_bytes = zf.read("IntuneWinPackage/Metadata/Detection.xml")
            root = ET.fromstring(detection_xml_bytes.decode("utf-8"))

            setup_name = root.find("SetupFile").text
            enc_elem = root.find("EncryptionInfo")
            enc_key = base64.b64decode(enc_elem.find("EncryptionKey").text)
            mac_key = base64.b64decode(enc_elem.find("MacKey").text)
            iv = base64.b64decode(enc_elem.find("InitializationVector").text)
            expected_mac = base64.b64decode(enc_elem.find("Mac").text)
            expected_digest = base64.b64decode(enc_elem.find("FileDigest").text)

            encrypted_data = zf.read(f"IntuneWinPackage/Contents/{setup_name}.intunewin")

            # Verify HMAC
            calculated_mac = hmac.new(mac_key, encrypted_data, hashlib.sha256).digest()
            if calculated_mac != expected_mac:
                raise ValueError("HMAC verification failed! File corrupted or tampered.")

            # Decrypt
            cipher = Cipher(algorithms.AES(enc_key), modes.CBC(iv), backend=default_backend())
            decryptor = cipher.decryptor()
            padded_data = decryptor.update(encrypted_data) + decryptor.finalize()
            plaintext_data = unpad_pkcs7(padded_data)

            # Verify Digest
            calculated_digest = hashlib.sha256(plaintext_data).digest()
            if calculated_digest != expected_digest:
                raise ValueError("Plaintext SHA-256 digest verification failed!")

            os.makedirs(output_dir, exist_ok=True)
            out_file = os.path.join(output_dir, setup_name)
            with open(out_file, "wb") as f:
                f.write(plaintext_data)

            return {
                "verified": True,
                "setup_file": out_file,
                "size": len(plaintext_data),
                "name": root.find("Name").text
            }
