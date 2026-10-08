import cv2
from pathlib import Path
detector = cv2.QRCodeDetector()
for n in range(1,11):
    path=Path('.sites-runtime/qa') / ('qr-' + str(n) + '.png')
    image=cv2.imread(str(path))
    assert image is not None, 'Missing QR image ' + str(n)
    decoded, points, _=detector.detectAndDecode(image)
    assert decoded == 'http://127.0.0.1:5173/destination/' + str(n) + '#information', 'Wrong QR destination: ' + repr(decoded)
    print('PASS: QR ' + str(n) + ' decodes to destination ' + str(n))
