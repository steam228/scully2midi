let sound, fft;
let freq = 0;
let midiNotes = [];
let lastNote = null;
let lastNoteTime = 0;
let startTime = 0;
let isRecording = false;

// Define note frequencies for all octaves
const noteFrequencies = {
  C: [16.35, 32.7, 65.41, 130.81, 261.63, 523.25, 1046.5, 2093, 4186],
  "C#": [17.32, 34.65, 69.3, 138.59, 277.18, 554.37, 1108.73, 2217.46, 4434.92],
  D: [18.35, 36.71, 73.42, 146.83, 293.66, 587.33, 1174.66, 2349.32, 4698.63],
  "D#": [19.45, 38.89, 77.78, 155.56, 311.13, 622.25, 1244.51, 2489, 4978],
  E: [20.6, 41.2, 82.41, 164.81, 329.63, 659.25, 1318.51, 2637, 5274],
  F: [21.83, 43.65, 87.31, 174.61, 349.23, 698.46, 1396.91, 2793.83, 5587.65],
  "F#": [23.12, 46.25, 92.5, 185, 369.99, 739.99, 1479.98, 2959.96, 5919.91],
  G: [24.5, 49, 98, 196, 392, 783.99, 1567.98, 3135.96, 6271.93],
  "G#": [
    25.96, 51.91, 103.83, 207.65, 415.3, 830.61, 1661.22, 3322.44, 6644.88,
  ],
  A: [27.5, 55, 110, 220, 440, 880, 1760, 3520, 7040],
  "A#": [
    29.14, 58.27, 116.54, 233.08, 466.16, 932.33, 1864.66, 3729.31, 7458.62,
  ],
  B: [30.87, 61.74, 123.47, 246.94, 493.88, 987.77, 1975.53, 3951, 7902.13],
};

// Replace the noteToMidi function with this more accurate version
function noteToMidi(freq) {
  // A4 is MIDI note 69 at 440Hz
  if (freq <= 0) return 0;
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

// Add intensity conversion helper
function intensityToVelocity(intensity) {
  return Math.min(127, Math.round(intensity * 127));
}

function findClosestNote(frequency) {
  let closestNote = "";
  let closestOctave = 0;
  let minDifference = Infinity;
  let percentageOff = 0;

  for (let note in noteFrequencies) {
    noteFrequencies[note].forEach((noteFreq, octave) => {
      let difference = Math.abs(frequency - noteFreq);
      let percentage = (difference / noteFreq) * 100;

      if (difference < minDifference) {
        minDifference = difference;
        closestNote = note;
        closestOctave = octave;
        percentageOff = percentage;
      }
    });
  }

  // Only return a note if we're within 5% of a known frequency
  if (percentageOff <= 5) {
    return `${closestNote}${closestOctave}`;
  } else {
    return "Unknown";
  }
}

function preload() {
  // Try to load the whale sound file from root directory instead of the sounds folder
  soundFormats("wav", "mp3");
  try {
    sound = loadSound(
      "KillerWhale_100Hz.wav",
      // Success callback
      () => {
        console.log("Sound loaded successfully");
      },
      // Error callback
      (err) => {
        console.error("Error loading sound:", err);
      }
    );
  } catch (e) {
    console.error("Exception loading sound:", e);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  fft = new p5.FFT(0.9, 4096);
  sound.connect(fft);
  textSize(32);
  textAlign(CENTER, CENTER);
  angleMode(DEGREES);
  textFont("Noto Sans");

  // Handle file input
  let fileInput = document.getElementById("audioFile");
  fileInput.addEventListener("change", function (e) {
    let file = e.target.files[0];
    let fileUrl = URL.createObjectURL(file);
    loadNewSound(fileUrl);
  });

  // Handle preset dropdown
  let presetSelect = document.getElementById("presetFiles");
  presetSelect.addEventListener("change", function (e) {
    if (e.target.value) {
      loadNewSound(e.target.value);
    }
  });
}

function loadNewSound(url) {
  if (sound && sound.isPlaying()) {
    sound.stop();
    // Create MIDI file when changing sounds
    if (midiNotes.length > 0) {
      if (lastNote) {
        lastNote.duration = millis() - lastNoteTime;
      }
      createMidiFile();
    }
  }

  // Reset recording data
  midiNotes = [];
  lastNote = null;

  loadSound(
    url,
    // Success callback
    function (newSound) {
      sound = newSound;
      sound.connect(fft);
      sound.play();
      startTime = millis();
      console.log("Successfully loaded and playing:", url);
    },
    // Error callback
    function (err) {
      console.error("Error loading sound:", url, err);
      alert("Failed to load audio file. See console for details.");
    }
  );
}

function createMidiFile() {
  if (!midiNotes.length) {
    console.log("No notes recorded");
    return;
  }

  try {
    // MIDI file header
    const header = [
      0x4d,
      0x54,
      0x68,
      0x64, // MThd
      0x00,
      0x00,
      0x00,
      0x06, // Header size
      0x00,
      0x00, // Format 0
      0x00,
      0x01, // One track
      0x00,
      0x60, // 96 ticks per quarter note
    ];

    // Start track
    const trackHeader = [
      0x4d,
      0x54,
      0x72,
      0x6b, // MTrk
    ];

    // Track events
    let trackData = [];

    // Set tempo (120 BPM = 500000 microseconds per quarter note)
    trackData = trackData.concat([
      0x00,
      0xff,
      0x51,
      0x03, // Tempo meta event
      0x07,
      0xa1,
      0x20, // 500000 in microseconds
    ]);

    // Set instrument (piano)
    trackData = trackData.concat([
      0x00,
      0xc0,
      0x00, // Program change to piano
    ]);

    // Sort notes by time
    const notes = midiNotes
      .sort((a, b) => a.time - b.time)
      .filter(
        (note) => note.midi >= 0 && note.midi <= 127 && note.duration > 0
      );

    // Add notes
    let currentTime = 0;
    notes.forEach((note, index) => {
      const deltaTime = Math.max(0, Math.floor((note.time - currentTime) / 10));
      const duration = Math.max(1, Math.floor(note.duration / 10));

      // Note on
      trackData = trackData.concat([
        deltaTime & 0x7f, // Delta time
        0x90, // Note on, channel 0
        note.midi & 0x7f, // Note number
        (note.velocity || 64) & 0x7f, // Velocity
      ]);

      // Note off
      trackData = trackData.concat([
        duration & 0x7f, // Delta time
        0x80, // Note off, channel 0
        note.midi & 0x7f, // Note number
        0x00, // Velocity
      ]);

      currentTime = note.time + duration;
      console.log(
        `Added note ${index}: ${note.note}, duration: ${duration} ticks`
      );
    });

    // End of track
    trackData = trackData.concat([0x00, 0xff, 0x2f, 0x00]);

    // Calculate track length
    const trackLength = new Uint32Array([trackData.length]);
    const trackLengthBytes = new Uint8Array(trackLength.buffer).reverse();

    // Combine all parts
    const midiData = new Uint8Array([
      ...header,
      ...trackHeader,
      ...Array.from(trackLengthBytes),
      ...trackData,
    ]);

    // Create and download file
    const blob = new Blob([midiData], { type: "audio/midi" });
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:]/g, "-");
    const filename = `recorded_notes_${timestamp}.mid`;

    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);

    console.log("MIDI file created:", filename);
  } catch (error) {
    console.error("Error creating MIDI file:", error);
  }
}

function draw() {
  background(0);
  noFill();

  let spectrum = fft.analyze();
  let soundWave = fft.waveform();

  let frequencies = fft.analyze("magnitude");
  let peaks = findPeaks(frequencies);

  let audioSampleRate = 44100;
  let binWidth = audioSampleRate / frequencies.length;
  freq = Math.round(peaks[0] * binWidth);
  let musicalNote = findClosestNote(freq);

  translate(width / 2, height / 2);

  // Draw spectrum in white with semicircle arrangement
  stroke(255);
  strokeWeight(2);
  // Upper semicircle
  beginShape();
  for (let i = 0; i <= 180; i++) {
    let index = floor(
      map(constrain(i, 0, 180), 0, 180, 0, spectrum.length - 1)
    );
    let r = map(spectrum[index], 0, 255, 150, 450);
    let x = r * sin(i);
    let y = -r * cos(i);
    vertex(x, y);
  }
  endShape();

  // Lower semicircle (mirrored)
  beginShape();
  for (let i = 0; i <= 180; i++) {
    let index = floor(
      map(constrain(i, 0, 180), 0, 180, 0, spectrum.length - 1)
    );
    let r = map(spectrum[index], 0, 255, 150, 450);
    let x = r * -sin(i);
    let y = r * cos(i);
    vertex(x, y);
  }
  endShape();

  // Draw waveform in red
  stroke(180, 130, 30);
  // Right semicircle
  beginShape();
  for (let i = 0; i <= 180; i++) {
    let index = floor(
      map(constrain(i, 0, 180), 0, 180, 0, soundWave.length - 1)
    );
    let r = map(soundWave[index], -1, 1, 100, 400);
    let x = r * sin(i);
    let y = r * cos(i);
    vertex(x, y);
  }
  endShape();
  // Left semicircle (mirrored)
  beginShape();
  for (let i = 0; i <= 180; i++) {
    let index = floor(
      map(constrain(i, 0, 180), 0, 180, 0, soundWave.length - 1)
    );
    let r = map(soundWave[index], -1, 1, 100, 400);
    let x = r * -sin(i);
    let y = r * cos(i);
    vertex(x, y);
  }
  endShape();

  // Display frequency and note
  noStroke();
  fill(255);
  push();
  translate(-width / 2, -height / 2); // Reset translation for text
  textStyle(BOLD);
  text(`${freq} Hz - ${musicalNote}`, width / 2, height / 2); // Centered on screen
  pop();

  // Only record notes when sound is playing and recording is active
  if (
    isRecording &&
    sound &&
    sound.isPlaying() &&
    freq > 0 &&
    musicalNote !== "Unknown"
  ) {
    let now = millis();
    let midiNote = noteToMidi(freq);

    // Only record if we have a valid MIDI note number
    if (midiNote >= 0 && midiNote <= 127) {
      let intensity = fft.getEnergy(freq);
      let velocity = intensityToVelocity(intensity);

      if (lastNote) {
        if (lastNote.midi !== midiNote) {
          // Complete the previous note
          lastNote.duration = now - lastNoteTime;
          if (lastNote.duration > 0) {
            // Create a new object for the note
            midiNotes.push({
              midi: lastNote.midi,
              velocity: lastNote.velocity,
              time: lastNote.time,
              note: lastNote.note,
              duration: lastNote.duration,
            });
            console.log("Note recorded:", lastNote);
          }

          // Start new note
          lastNote = {
            midi: midiNote,
            velocity: Math.min(127, Math.max(1, velocity)), // Ensure valid velocity
            time: now - startTime,
            note: musicalNote,
            duration: 0,
          };
          lastNoteTime = now;
        }
      } else {
        // First note
        lastNote = {
          midi: midiNote,
          velocity: Math.min(127, Math.max(1, velocity)), // Ensure valid velocity
          time: now - startTime,
          note: musicalNote,
          duration: 0,
        };
        lastNoteTime = now;
      }
    }
  }

  // Show recording indicator when sound is playing
  if (sound.isPlaying()) {
    push();
    translate(-width / 2, -height / 2);
    fill(255, 0, 0);
    noStroke();
    ellipse(width - 30, 30, 20, 20);
    pop();
  }
}

function findPeaks(frequencies) {
  let peaks = [];
  let minPeakDistance = 10;
  let threshold = 30;
  let octaveBands = 9; // Number of octaves to analyze

  // Analyze each octave separately
  for (let octave = 0; octave < octaveBands; octave++) {
    let startBin = Math.floor(
      frequencies.length * Math.pow(2, octave - octaveBands)
    );
    let endBin = Math.floor(
      frequencies.length * Math.pow(2, octave - octaveBands + 1)
    );

    let maxVal = 0;
    let maxBin = 0;

    // Find peak in this octave
    for (let i = startBin; i < endBin; i++) {
      if (frequencies[i] > threshold && frequencies[i] > maxVal) {
        // Check if it's a local maximum
        if (
          frequencies[i] > frequencies[i - 1] &&
          frequencies[i] > frequencies[i + 1]
        ) {
          maxVal = frequencies[i];
          maxBin = i;
        }
      }
    }

    if (maxVal > 0) {
      peaks.push(maxBin);
    }
  }

  // Sort peaks by magnitude
  peaks.sort((a, b) => frequencies[b] - frequencies[a]);

  return peaks.slice(0, 3);
}

function mouseClicked() {
  // Only handle clicks if sound is loaded and within canvas
  if (!sound || mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height)
    return;

  try {
    if (sound.isPlaying()) {
      // Force stop the playback immediately
      sound.stop();
      isRecording = false;

      // Finalize last note duration before creating MIDI file
      if (lastNote) {
        lastNote.duration = millis() - lastNoteTime;
        if (lastNote.duration > 0) {
          midiNotes.push(lastNote);
        }
      }

      // Create MIDI file if we have notes
      if (midiNotes.length > 0) {
        createMidiFile();
      }

      // Reset recording data
      midiNotes = [];
      lastNote = null;

      // Ensure the audio context is suspended
      getAudioContext().suspend();

      console.log("Playback and recording stopped");
    } else {
      // Resume audio context and start playback
      getAudioContext()
        .resume()
        .then(() => {
          sound.stop(); // Reset to beginning
          sound.play();
          isRecording = true;

          // Reset recording data for new session
          midiNotes = [];
          lastNote = null;
          startTime = millis();
          lastNoteTime = startTime;
          console.log("Playback and recording started");
        });
    }
  } catch (error) {
    console.error("Error handling playback:", error);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Add this near the top of your file with other utility functions
function saveAs(blob, filename) {
  const link = document.createElement("a");
  link.style.display = "none";
  document.body.appendChild(link);

  // Create and revoke URL
  const url = window.URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();

  // Clean up
  window.URL.revokeObjectURL(url);
  document.body.removeChild(link);
}
