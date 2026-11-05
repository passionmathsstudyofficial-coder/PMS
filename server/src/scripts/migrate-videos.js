// Read-only migration inventory. Video titles and exercise languageMode do not
// reliably identify the spoken language, so legacy references are never guessed.
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import '../models/index.js';
import { Exercise } from '../models/Exercise.js';

try {
  await connectDB(env.MONGODB_URI);
  const exercises = await Exercise.find({ introVideo: { $ne: null } })
    .select('number slug introVideo introVideoEn introVideoHi').lean();
  console.log(JSON.stringify({ readOnly: true, reviewRequired: exercises }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
