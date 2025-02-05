import { db } from "@db";
import { files } from "@db/schema";
import { eq } from "drizzle-orm";

// ... other imports and code ...

router.get("/files/:id/download", async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const fileRecord = await db.query.files.findFirst({
      where: eq(files.id, fileId)
    });

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    console.log("Debug - Found file in database:", fileRecord);
    console.log("Debug - Looking for file at path:", path.join(uploadDir, fileRecord.path));

    // Update download count before sending file
    await db
      .update(files)
      .set({
        downloadCount: (fileRecord.downloadCount || 0) + 1,
        lastAccessed: new Date().toISOString()
      })
      .where(eq(files.id, fileId));

    // Send file
    res.download(
      path.join(uploadDir, fileRecord.path),
      fileRecord.name,
      (err) => {
        if (err) {
          console.error("Error downloading file:", err);
          res.status(500).json({ error: "Error downloading file" });
        }
      }
    );
  } catch (error) {
    console.error("Error in download endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ... rest of the file remains unchanged ...
