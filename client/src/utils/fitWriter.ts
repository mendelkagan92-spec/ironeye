import type { RunningWorkout } from '../types';

// FIT Protocol constants
const FIT_HEADER_SIZE = 14;
const FIT_PROTOCOL_VERSION = 0x20; // 2.0
const FIT_PROFILE_VERSION = 0x0810; // 20.80

// Message types
const MESG_FILE_ID = 0;
const MESG_WORKOUT = 26;
const MESG_WORKOUT_STEP = 27;

// Field types for file_id
const FIELD_TYPE = 0;
const FIELD_MANUFACTURER = 1;
const FIELD_PRODUCT = 2;
const FIELD_SERIAL = 3;
const FIELD_TIME_CREATED = 4;

// Workout fields
const WKT_SPORT = 4;
const WKT_NUM_STEPS = 6;
const WKT_NAME = 8;

// Workout step fields
const WKTS_MESSAGE_INDEX = 254;
const WKTS_DURATION_TYPE = 1;
const WKTS_DURATION_VALUE = 2;
const WKTS_TARGET_TYPE = 3;
const WKTS_TARGET_VALUE = 4;
const WKTS_INTENSITY = 9;
const WKTS_WKT_STEP_NAME = 0;

// Enums
const FILE_TYPE_WORKOUT = 5;
const MANUFACTURER_DEVELOPMENT = 255;
const SPORT_RUNNING = 1;

const DURATION_TYPE_TIME = 0;
const TARGET_TYPE_HEART_RATE = 1;

const INTENSITY_ACTIVE = 0;
const INTENSITY_REST = 1;
const INTENSITY_WARMUP = 2;
const INTENSITY_COOLDOWN = 3;

function intensityToFit(intensity: string, stepType: string): number {
  if (stepType === 'warmup') return INTENSITY_WARMUP;
  if (stepType === 'cooldown') return INTENSITY_COOLDOWN;
  if (intensity === 'easy') return INTENSITY_REST;
  return INTENSITY_ACTIVE;
}

function hrZoneToTarget(zone: number): number {
  // FIT HR zone target values: zone 1-5 map to hr_zone enum
  return zone;
}

class FitEncoder {
  private data: number[] = [];
  private crc = 0;

  private writeByte(b: number) {
    this.data.push(b & 0xff);
    this.updateCrc(b & 0xff);
  }

  private writeUint16LE(v: number) {
    this.writeByte(v & 0xff);
    this.writeByte((v >> 8) & 0xff);
  }

  private writeUint32LE(v: number) {
    this.writeByte(v & 0xff);
    this.writeByte((v >> 8) & 0xff);
    this.writeByte((v >> 16) & 0xff);
    this.writeByte((v >> 24) & 0xff);
  }

  private writeString(s: string, maxLen: number) {
    const bytes = new TextEncoder().encode(s);
    for (let i = 0; i < maxLen; i++) {
      this.writeByte(i < bytes.length ? bytes[i] : 0);
    }
  }

  private updateCrc(byte: number) {
    const crcTable = [
      0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
      0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400,
    ];
    let tmp = crcTable[this.crc & 0xf];
    this.crc = (this.crc >> 4) & 0x0fff;
    this.crc = this.crc ^ tmp ^ crcTable[byte & 0xf];
    tmp = crcTable[this.crc & 0xf];
    this.crc = (this.crc >> 4) & 0x0fff;
    this.crc = this.crc ^ tmp ^ crcTable[(byte >> 4) & 0xf];
  }

  private writeDefinition(localMesg: number, globalMesg: number, fields: { num: number; size: number; type: number }[]) {
    // Record header: definition message
    this.writeByte(0x40 | (localMesg & 0x0f));
    this.writeByte(0); // reserved
    this.writeByte(0); // architecture: little endian
    this.writeUint16LE(globalMesg);
    this.writeByte(fields.length);
    for (const f of fields) {
      this.writeByte(f.num);
      this.writeByte(f.size);
      this.writeByte(f.type);
    }
  }

  private writeDataHeader(localMesg: number) {
    this.writeByte(localMesg & 0x0f);
  }

  encode(workout: RunningWorkout): Uint8Array {
    this.data = [];
    this.crc = 0;

    // Reserve space for header (write it last)
    const headerPlaceholder = this.data.length;

    // --- File ID Message ---
    this.writeDefinition(0, MESG_FILE_ID, [
      { num: FIELD_TYPE, size: 1, type: 0 },        // enum
      { num: FIELD_MANUFACTURER, size: 2, type: 132 }, // uint16
      { num: FIELD_PRODUCT, size: 2, type: 132 },     // uint16
      { num: FIELD_SERIAL, size: 4, type: 134 },      // uint32z
      { num: FIELD_TIME_CREATED, size: 4, type: 134 }, // uint32
    ]);

    this.writeDataHeader(0);
    this.writeByte(FILE_TYPE_WORKOUT);
    this.writeUint16LE(MANUFACTURER_DEVELOPMENT);
    this.writeUint16LE(1);
    this.writeUint32LE(12345);
    // Garmin epoch: Dec 31 1989 00:00:00 UTC
    const garminEpoch = new Date('1989-12-31T00:00:00Z').getTime();
    const timestamp = Math.floor((Date.now() - garminEpoch) / 1000);
    this.writeUint32LE(timestamp);

    // --- Workout Message ---
    const nameBytes = new TextEncoder().encode(workout.workout_name);
    const nameLen = Math.min(nameBytes.length + 1, 40); // +1 for null terminator, max 40
    const namePadded = Math.max(nameLen, 16);

    this.writeDefinition(1, MESG_WORKOUT, [
      { num: WKT_SPORT, size: 1, type: 0 },          // enum
      { num: WKT_NUM_STEPS, size: 2, type: 132 },     // uint16
      { num: WKT_NAME, size: namePadded, type: 7 },   // string
    ]);

    this.writeDataHeader(1);
    this.writeByte(SPORT_RUNNING);
    this.writeUint16LE(workout.steps.length);
    this.writeString(workout.workout_name, namePadded);

    // --- Workout Step Messages ---
    this.writeDefinition(2, MESG_WORKOUT_STEP, [
      { num: WKTS_MESSAGE_INDEX, size: 2, type: 132 },   // uint16
      { num: WKTS_WKT_STEP_NAME, size: 24, type: 7 },    // string
      { num: WKTS_DURATION_TYPE, size: 1, type: 0 },      // enum
      { num: WKTS_DURATION_VALUE, size: 4, type: 134 },   // uint32
      { num: WKTS_TARGET_TYPE, size: 1, type: 0 },        // enum
      { num: WKTS_TARGET_VALUE, size: 4, type: 134 },     // uint32
      { num: WKTS_INTENSITY, size: 1, type: 0 },          // enum
    ]);

    for (let i = 0; i < workout.steps.length; i++) {
      const step = workout.steps[i];
      this.writeDataHeader(2);
      this.writeUint16LE(i); // message_index
      this.writeString(step.name, 24); // wkt_step_name
      this.writeByte(DURATION_TYPE_TIME); // duration_type = time
      this.writeUint32LE(step.duration_minutes * 60 * 1000); // duration_value in ms
      this.writeByte(TARGET_TYPE_HEART_RATE); // target_type
      this.writeUint32LE(hrZoneToTarget(step.heart_rate_zone)); // target_value
      this.writeByte(intensityToFit(step.intensity, step.type)); // intensity
    }

    // Build final file
    const dataBytes = new Uint8Array(this.data);
    const dataSize = dataBytes.length;

    // Now build full file: header + data + CRC
    const result = new Uint8Array(FIT_HEADER_SIZE + dataSize + 2);
    const view = new DataView(result.buffer);

    // Header
    result[0] = FIT_HEADER_SIZE; // header size
    result[1] = FIT_PROTOCOL_VERSION;
    view.setUint16(2, FIT_PROFILE_VERSION, true);
    view.setUint32(4, dataSize, true);
    result[8] = 0x2E; // '.'
    result[9] = 0x46; // 'F'
    result[10] = 0x49; // 'I'
    result[11] = 0x54; // 'T'

    // Header CRC
    let headerCrc = 0;
    const crcTable = [
      0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
      0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400,
    ];
    for (let i = 0; i < 12; i++) {
      let tmp = crcTable[headerCrc & 0xf];
      headerCrc = (headerCrc >> 4) & 0x0fff;
      headerCrc = headerCrc ^ tmp ^ crcTable[result[i] & 0xf];
      tmp = crcTable[headerCrc & 0xf];
      headerCrc = (headerCrc >> 4) & 0x0fff;
      headerCrc = headerCrc ^ tmp ^ crcTable[(result[i] >> 4) & 0xf];
    }
    view.setUint16(12, headerCrc, true);

    // Copy data
    result.set(dataBytes, FIT_HEADER_SIZE);

    // File CRC (over header + data)
    let fileCrc = 0;
    for (let i = 0; i < FIT_HEADER_SIZE + dataSize; i++) {
      let tmp = crcTable[fileCrc & 0xf];
      fileCrc = (fileCrc >> 4) & 0x0fff;
      fileCrc = fileCrc ^ tmp ^ crcTable[result[i] & 0xf];
      tmp = crcTable[fileCrc & 0xf];
      fileCrc = (fileCrc >> 4) & 0x0fff;
      fileCrc = fileCrc ^ tmp ^ crcTable[(result[i] >> 4) & 0xf];
    }
    view.setUint16(FIT_HEADER_SIZE + dataSize, fileCrc, true);

    return result;
  }
}

export function generateFitFile(workout: RunningWorkout): Uint8Array {
  const encoder = new FitEncoder();
  return encoder.encode(workout);
}

export function downloadFitFile(workout: RunningWorkout) {
  const fitData = generateFitFile(workout);
  const blob = new Blob([fitData.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${workout.workout_name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.fit`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
