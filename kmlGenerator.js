import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { create } from 'xmlbuilder2';

// === CONFIG ===
const inputCSV = '4peaks.csv';         // Your CSV file
const outputFolder = './kml_peaks';     // Output KML directory

// === Ensure output folder exists ===
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder);
}

// === Sanitize filenames
const sanitizeFileName = (name = 'unnamed') =>
  name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w\-]/g, '');

// === Process CSV
fs.createReadStream(inputCSV)
  .pipe(csv({ separator: ',', mapHeaders: ({ header }) => header.trim() }))
  .on('data', (row) => {
    const name = (row.name || '').trim();
    const lon = (row.longitude || '').trim();
    const lat = (row.latitude || '').trim();

    if (!name || !lon || !lat) {
      console.warn(`⚠️ Skipping invalid row: ${JSON.stringify(row)}`);
      return;
    }

    const coordinates = `${lon},${lat}`;

    // Dynamically include all other fields in <description>
    const extraFields = Object.entries(row)
      .filter(([key]) => !['name', 'longitude', 'latitude'].includes(key.toLowerCase()))
      .map(([key, value]) => `${key.trim()}: ${String(value).trim()}`)
      .join('\n');

    const fullDescription = `Name: ${name}\nCoordinates: ${lat}, ${lon}${extraFields ? `\n${extraFields}` : ''}`;

    const kmlDoc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('kml', { xmlns: 'http://www.opengis.net/kml/2.2' })
        .ele('Document')
          .ele('Style', { id: 'peakIconStyle' })
            .ele('IconStyle')
              .ele('scale').txt('1.2').up()
              .ele('Icon')
                .ele('href').txt('https://maps.google.com/mapfiles/kml/shapes/mountains.png')
              .up().up().up().up()
          .ele('Placemark')
            .ele('name').txt(name).up()
            .ele('styleUrl').txt('#peakIconStyle').up()
            .ele('description').txt(fullDescription).up()
            .ele('Point')
              .ele('coordinates').txt(coordinates)
    .end({ prettyPrint: true });

    const filename = `kml_${sanitizeFileName(name)}.kml`;
    const filepath = path.join(outputFolder, filename);
    fs.writeFileSync(filepath, kmlDoc);
    console.log(`✅ Created: ${filename}`);
  })
  .on('end', () => {
    console.log(`🎉 All dynamic KML files saved in: ${outputFolder}`);
  });
