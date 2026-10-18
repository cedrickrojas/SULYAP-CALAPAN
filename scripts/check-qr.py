import cv2
from pathlib import Path
import sys

origin = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5173').rstrip('/')
qa = Path(sys.argv[2] if len(sys.argv) > 2 else '.sites-runtime/qa')
detector = cv2.QRCodeDetector()
for n in range(1,11):
    path=qa / ('qr-' + str(n) + '.png')
    image=cv2.imread(str(path))
    assert image is not None, 'Missing QR image ' + str(n)
    decoded, points, _=detector.detectAndDecode(image)
    assert decoded == origin + '/destination/' + str(n) + '#information', 'Wrong QR destination: ' + repr(decoded)
    print('PASS: QR ' + str(n) + ' decodes to destination ' + str(n))

image = cv2.imread(str(qa / 'downloaded-qr.png'), cv2.IMREAD_UNCHANGED)
assert image is not None, 'Missing downloaded PNG'
assert image.shape[:2] == (1000, 1000), 'Downloaded PNG must be 1000 x 1000'
decoded, _, _ = detector.detectAndDecode(image)
assert decoded == origin + '/destination/1#information', 'Wrong downloaded QR destination: ' + repr(decoded)
print('PASS: downloaded PNG decodes to destination 1')
