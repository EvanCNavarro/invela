import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function TestImageModal() {
  const [showModal, setShowModal] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  // Test different image paths to see which ones work
  const imagePaths = [
    "/assets/modal_userOboarding_1.png",
    "/assets/harmonized_modal_userOboarding_2.png",
    "/modal_userOboarding_1.png",
    "/harmonized_modal_userOboarding_2.png",
  ];

  // Check if each image exists by attempting to load it
  useEffect(() => {
    imagePaths.forEach((path) => {
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded successfully:', path);
      };
      img.onerror = () => {
        console.error('Image failed to load:', path);
        setErrorMessages(prev => [...prev, `Failed to load ${path}`]);
      };
      img.src = path;
    });
  }, []);

  const handleNextImage = () => {
    setImageIndex((prev) => (prev + 1) % imagePaths.length);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle>Image Test</DialogTitle>
        <DialogDescription>Testing image loading for path: {imagePaths[imageIndex]}</DialogDescription>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-muted p-4 rounded-lg w-full h-64 flex items-center justify-center">
            <img
              src={imagePaths[imageIndex]}
              alt={`Test image ${imageIndex + 1}`}
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
                console.error('Failed to load image in component:', imagePaths[imageIndex]);
              }}
            />
          </div>
          
          {errorMessages.length > 0 && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded w-full">
              <p className="font-medium">Error loading images:</p>
              <ul className="list-disc pl-5 mt-2">
                {errorMessages.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex justify-between w-full">
            <Button variant="secondary" onClick={handleCloseModal}>
              Close
            </Button>
            <Button onClick={handleNextImage}>
              Try Next Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}