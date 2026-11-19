import mongoose from 'mongoose';
import { resolvePath } from '../server/src/services/publicContent.js';

await mongoose.connect(process.env.MONGODB_URI);
try {
  const result = await resolvePath('/reference-solutions/rs-aggarwal/class-8/adhyay-1/prashnavali-1-1', {
    preview: false
  });
  console.log('Result found:');
  console.log('Chapter:', result.data?.chapter);
  console.log('Exercise:', result.data?.exercise);
  console.log('Breadcrumbs:', result.breadcrumbs);
} catch (e) {
  console.error('Error resolving path:', e);
}
await mongoose.disconnect();
