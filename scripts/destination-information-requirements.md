# Destination information coverage

The seven content requirements in the client's questionnaire apply to all ten selected destinations. The questionnaire's evaluation instructions and rating boxes are not website features.

| Client requirement | Website section |
| --- | --- |
| Destination information and description | Destination Information: introduction and background |
| Operating hours and fees | Operating Hours; Entrance Fees & Rates |
| Available activities | Available Activities; Attractions |
| Destination images | Existing hero and Destination Gallery, with a direct gallery link |
| Precautionary measures | Precautions & Rules: destination-specific precautions, existing rules, emergency assistance |
| Contact details and information | Contact Details: destination contact where published, Calapan tourism assistance, office address/hours, telephone/email links |
| Transportation details | Transportation & Directions: arrival in Calapan, local options, routes, fare/booking questions, return arrangements |

Additional practical information appears in Travel Tips: facilities to confirm, accessibility questions, packing, and group visits. Advice is tailored to each destination; it does not claim unverified facilities exist.

## Sources checked on 8 October 2026

- [Travel Oriental Mindoro tourism offices](https://www.travelorientalmindoro.ph/directory/tourism-offices): Calapan tourism office telephone, location, and directory-listed office hours. Office hours are explicitly separate from destination opening hours.
- [Travel Oriental Mindoro transport guide](https://www.travelorientalmindoro.ph/page/how-to-get-here): Batangas–Calapan ferry route and approximate RORO duration; current sailings, fares, and vehicle bookings remain operator-confirmed.
- [DILG Unified 911 guidance](https://calabarzon.dilg.gov.ph/remulla-unified-911-brings-emergency-response-closer-to-filipinos/): emergency assistance through 911. The guide makes no response-time guarantee.
- Destination-specific background, activities, published admission listings, historical schedules, and photographs retain their existing linked sources and qualifications.

Exact current admission/activity prices, local travel times, landing permissions, facility availability, and unconfirmed schedules are not invented. Historical museum/fountain advisories remain dated and require confirmation.

## Implementation

`src/destinations.js` keeps the existing IDs, slugs, content fields, and routes. It adds practical visitor information from `src/visitor-details.js` to the same destination records. All twelve information routes, maps, three-slot galleries, and QR behavior are retained. Photographs and their attribution are unchanged by this information update.
