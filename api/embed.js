import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // Set the X-Frame-Options header
  res.setHeader('X-Frame-Options', 'ALLOW-FROM https://gamesinclass.pages.dev');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://your-allowed-origin.com;");

  // Read the index.html file
  const filePath = path.join(process.cwd(), '/src/index.tsx'); // Adjust the path if necessary
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading index.html');
      return;
    }
    res.status(200).send(data);
  });
}
