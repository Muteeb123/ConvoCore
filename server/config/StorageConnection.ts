import { Storage } from '@google-cloud/storage';
import { format } from 'date-fns';
 
if (!process.env.GCP_KEY) {
  throw new Error("GCP_KEY environment variable not set.");
}
 
const rawCredentials = JSON.parse(process.env.GCP_KEY);
if (rawCredentials.private_key) {
  rawCredentials.private_key = rawCredentials.private_key.replace(/\\n/g, '\n');
}
 
const storage = new Storage({ credentials: rawCredentials });
const bucket = storage.bucket('crmlogs');
 
async function appendToCurrentDateFile(text:any) {
  const monthYear = format(new Date(), "MMMMyyyy").toLowerCase();
  const folderPath = `${monthYear}/`;
  const [files] = await bucket.getFiles({ prefix: folderPath, maxResults: 1 });
  if (files.length === 0) {
    await bucket.file(`${folderPath}placeholder.txt`).save("");
    console.log(`Folder "${folderPath}" created.`);
  } else {
    console.log(`Folder "${folderPath}" already exists.`);
  }
 
  const todayFileName = `${format(new Date(), "dMMMMyyyy").toLowerCase()}.txt`;
  const todayFilePath = `${folderPath}${todayFileName}`;
  const todayFile = bucket.file(todayFilePath);
  let oldContent = "";
  const [exists] = await todayFile.exists();
  if (exists) {
    const [contents] = await todayFile.download();
    oldContent = contents.toString();
  } else {
  }
  const newContent = oldContent + (oldContent ? "\n" : "") + text;
  await todayFile.save(newContent);
  return todayFilePath;
}
 
export default appendToCurrentDateFile;
 
