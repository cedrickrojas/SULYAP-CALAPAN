# Destination information coverage

The seven content requirements in the client's questionnaire apply to all ten selected destinations. The questionnaire's evaluation instructions and rating boxes are not website features.

| Client requirement | Clickable title and included information |
| --- | --- |
| Destination information and description | Destination Information and Description: introduction, background, best time to visit, nearby places |
| Operating hours and fees | Operating Hours and Fees: destination schedule, admission and activity rates, confirmation advice |
| Available activities | Available Activities: things to do and attractions |
| Destination images | Destination Images: three-photo gallery with captions and lightbox controls |
| Precautionary measures | Precautionary Measures: specific precautions, rules, travel tips, facilities/accessibility planning, emergency assistance |
| Contact details and information | Contact Details and Information: published destination contact, tourism assistance, office address/hours, telephone/email links |
| Transportation details | Destination Transportation Details: address, coordinates and map, arrival in Calapan, local options, routes, fares/booking, return arrangements |

All ten destinations use these seven menu cards. Planning advice does not claim unverified facilities exist.

## Sources checked on 8 October 2026

- [Travel Oriental Mindoro tourism offices](https://www.travelorientalmindoro.ph/directory/tourism-offices): Calapan tourism office telephone, location, and directory-listed office hours. Office hours are explicitly separate from destination opening hours.
- [Travel Oriental Mindoro transport guide](https://www.travelorientalmindoro.ph/page/how-to-get-here): Batangas–Calapan ferry route and approximate RORO duration; current sailings, fares, and vehicle bookings remain operator-confirmed.
- [DILG Unified 911 guidance](https://calabarzon.dilg.gov.ph/remulla-unified-911-brings-emergency-response-closer-to-filipinos/): emergency assistance through 911. The guide makes no response-time guarantee.
- Destination-specific background, activities, published admission listings, historical schedules, and photographs retain their existing linked sources and qualifications.

Exact current admission/activity prices, local travel times, landing permissions, facility availability, and unconfirmed schedules are not invented. Historical museum/fountain advisories remain dated and require confirmation.

## Implementation

`src/destinations.js` keeps the existing IDs, slugs, content fields, and routes. It adds practical visitor information from `src/visitor-details.js` to the same destination records. Seven information routes group the existing content. Old location, fee, attraction, best-time, travel-tip, and nearby-place routes redirect to their combined sections. Maps, three-slot galleries, stable destination URLs, and QR behavior are retained. Photographs and their attribution are unchanged by this information update.
