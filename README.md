# Scully2MIDI

A real-time audio analysis and MIDI conversion tool for whale sounds, with visual representation of detected frequencies.

## Features

- Load and analyze whale sounds in various audio formats
- Convert detected frequencies to musical notes
- Generate MIDI files from detected notes
- Real-time visualization of sound frequencies and waveforms
- Streaming note visualization showing detected notes as they occur
- Minimalistic interface with icon-based controls

## Setup

1. Place your whale sound files in the `sounds/` directory
2. Update the `sounds/sound_library.json` file with metadata for your sound files:
   ```json
   {
     "sounds": [
       {
         "filename": "YourWhaleSoundFile.wav",
         "name": "Descriptive Name",
         "species": "Scientific Name",
         "date": "YYYY-MM-DD",
         "location": "Recording Location"
       }
     ]
   }
   ```

## Usage

1. Open `index.html` in a web browser
2. Select a whale sound from the dropdown menu
3. Use the play/pause button to control playback
4. Toggle MIDI recording with the music note switch
5. When the sound stops, a MIDI file will be automatically generated and downloaded (if MIDI recording is enabled)

## Interface

The application features a minimalistic, icon-based interface:

- **Sound Selector**: Dropdown menu to choose whale sounds
- **Play/Pause Button**: Icon button to control audio playback
- **MIDI Toggle**: Switch with music note icon to enable/disable MIDI recording
- **View Toggle**: Buttons to switch between main and circular visualizations
- **Info Display**: Shows frequency and note information in the bottom right

## Visualization

The application offers two visualization modes:

1. **Main View (Bar Visualization)**: 
   - Shows notes as horizontal bars moving from right to left
   - Height represents pitch, width represents duration
   - Displays frequency and note information in the bottom right

2. **Circular View**:
   - Shows a circular representation of the frequency spectrum
   - Blue waveforms represent different aspects of the sound
   - Compact 70% scaled visualization for better screen utilization

## Notes on Audio Files

- Supported formats: WAV, MP3 (and other formats supported by your browser)
- Higher quality recordings will yield better frequency analysis results
- Files with minimal background noise will provide cleaner note detection 