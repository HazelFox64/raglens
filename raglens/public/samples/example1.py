# You can buy the book at:
# www.thepythonbook.com

# Instructions:
# 1. Install dependencies: pip install cryptography
# 2. Run the script: python 01_digital_signature.py

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidSignature

# Generate a private key and derive the public key.
private = ec.generate_private_key(ec.SECP256R1())
public = private.public_key()

# Serialize the private key to PEM format.
pem = private.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption())

# Print the private key.
print(f"The private key is: {pem}")

# Sign the message with the private key.
signature = private.sign(
    b"Send 1 Euro to IBAN 123",
    ec.ECDSA(hashes.SHA256()))

# Print the signature.
print(f"The signature is: {signature}")

# Verify the signature with the public key.
# Since the message did not change, the signature is valid.
try:
    public.verify(
        signature,
        b"Send 1 Euro to IBAN 123",
        ec.ECDSA(hashes.SHA256()))
    print("Verification OK")
except InvalidSignature:
    print("Verification NOK")

# Try to verify the signature with a different message.
# Since the message changed, the signature is invalid.
try:
    public.verify(
        signature,
        b"Send 100 Euro to IBAN 456",
        ec.ECDSA(hashes.SHA256()))
    print("Verification OK")
except InvalidSignature:
    print("Verification NOK")

# You can buy the book at:
# www.thepythonbook.com

# Instructions:
# 1. Install dependencies: pip install cryptography
# 2. Run the script: python 02_message_encryption.py

from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes

# Generate a private key and derive the public key.
private = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048)
public = private.public_key()

# Define the message to encrypt.
message = b"Secret message from The Python Book"
print(f"Message to encrypt: {message}")

# Encrypt the message using the public key.
# Now encrypted can only be decrypted with the private key.
encrypted = public.encrypt(
    message,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None))

# Print the encrypted message.
print(f"Encrypted message: {encrypted}")

# Decrypt the message using the private key.
decrypted = private.decrypt(
    encrypted,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None))

# Print the decrypted message.
print(f"Decrypted message: {decrypted}")

# You can buy the book at:
# www.thepythonbook.com

# Instructions:
# 1. Run the script: python 06_password_bruteforce.py

import itertools

# Brute force a password.
# It tries all possible combinations of characters up to a maximum length.
def brute_force(password, long_max=6):
    c = "abcdefghijklmnopqrstuvwxyz0123456789"
    
    for length in range(1, long_max + 1):
        print(f"Length {length}...")
        for attempt in itertools.product(c, repeat=length):
            attempt_s = ''.join(attempt)
            if attempt_s == password:
                return attempt_s
    return None

# Try to brute force a password.
password = "pass67"
found = brute_force(password, long_max=8)
print(f"Password found: {found}")

