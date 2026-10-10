import assert from 'node:assert/strict';
import {existsSync,statSync,readFileSync} from 'node:fs';
import {destinations,getDestination} from '../src/destinations.js';
const fields=['id','name','slug','description','background','address','latitude','longitude','directions','thingsToDo','attractions','operatingHours','entranceFee','bestTimeToVisit','rules','travelTips','contactInformation','nearbyPlaces','images','qrCodeUrl'];
assert.equal(destinations.length,10);
assert.equal(new Set(destinations.map(d=>d.id)).size,10);
assert.equal(new Set(destinations.map(d=>d.slug)).size,10);
for(const d of destinations){
 for(const field of fields)assert.ok(d[field]!==undefined, d.name+' missing '+field);
 if(d.latitude===null||d.longitude===null){assert.equal(d.latitude,null);assert.equal(d.longitude,null);assert.ok(d.mapNote.includes('awaiting verification'));}
 else{assert.ok(Number.isFinite(d.latitude)&&d.latitude>=-90&&d.latitude<=90);assert.ok(Number.isFinite(d.longitude)&&d.longitude>=-180&&d.longitude<=180);}
 assert.equal(d.qrCodeUrl,'/destination/'+d.id);assert.equal(getDestination(String(d.id)),d);assert.equal(getDestination(d.slug),d);
 assert.equal(d.images.length,3);
 for(const image of d.images){assert.ok(existsSync('public'+image.src),'Missing '+image.src);if(image.placeholder){assert.ok(image.src.endsWith('.svg'));assert.ok(readFileSync('public'+image.src,'utf8').includes('PHOTO COMING SOON'));}else{assert.ok(statSync('public'+image.src).size>10000);}}
}
assert.deepEqual(destinations.map(d=>d.name),['Sto. Niño Cathedral','Silonay Mangrove Conservation Eco-Park','Oriental Mindoro Heritage Museum','Calapan Zoological and Recreational Park','Plaza del Gobernador','Calapan City Plaza','Anaganahao Island','Caluangan Lake','Baco Islands','Suqui Beach']);
assert.ok(destinations.every(d=>d.municipality==='Calapan City'&&d.province==='Oriental Mindoro'));
console.log('PASS: the ten client-selected destinations in order, stable routes, valid map data, and thirty photos or explicitly labelled placeholders.');
