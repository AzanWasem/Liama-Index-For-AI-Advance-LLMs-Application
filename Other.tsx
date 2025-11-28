import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { GoogleGenAI, Modality } from '@google/genai';
import { blobToBase64 } from '../utils';

const Other: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageMime, setOriginalImageMime] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalImageMime(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setEditedImage(null); // Clear previous edit on new image upload
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async () => {
    if (!prompt || !originalImage || !originalImageMime) {
      setError('Please upload an image and enter a prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const base64Data = originalImage.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: originalImageMime } },
            { text: prompt },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      const firstPart = response.candidates?.[0]?.content?.parts?.[0];
      if (firstPart && firstPart.inlineData) {
        const newBase64 = firstPart.inlineData.data;
        const newMimeType = firstPart.inlineData.mimeType;
        setEditedImage(`data:${newMimeType};base64,${newBase64}`);
      } else {
         setError('Could not generate image. The model may not have returned an image.');
      }
    } catch (e: any) {
      setError(`An error occurred: ${e.message}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-100">AI Image Editor</h1>
        <p className="text-neutral-400 mt-1">Describe the changes you want to make.</p>
      </header>

      <GlassCard className="p-4 space-y-4">
        <div>
          <label htmlFor="image-upload" className="block text-sm font-medium text-neutral-300 mb-2">1. Upload Image</label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/30"
          />
        </div>

        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-neutral-300 mb-2">2. Describe Your Edit</label>
          <input
            id="prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Add a retro filter"
            className="w-full bg-neutral-900/70 border border-neutral-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={generateImage}
          disabled={isLoading || !originalImage || !prompt}
          className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 disabled:bg-neutral-600 disabled:cursor-not-allowed hover:bg-blue-500 active:scale-95"
        >
          {isLoading ? 'Generating...' : 'Generate'}
        </button>
      </GlassCard>
      
      {error && <p className="text-red-400 text-center">{error}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold text-lg text-neutral-200 mb-2 text-center">Original</h3>
          {originalImage ? (
            <img src={originalImage} alt="Original" className="rounded-lg w-full object-contain" />
          ) : (
            <div className="aspect-square bg-neutral-900/50 rounded-lg flex items-center justify-center text-neutral-500">
              Your image will appear here.
            </div>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-lg text-neutral-200 mb-2 text-center">Edited</h3>
          {isLoading ? (
            <div className="aspect-square bg-neutral-900/50 rounded-lg flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-t-blue-500 border-neutral-700 rounded-full animate-spin"></div>
            </div>
          ) : editedImage ? (
            <img src={editedImage} alt="Edited" className="rounded-lg w-full object-contain" />
          ) : (
            <div className="aspect-square bg-neutral-900/50 rounded-lg flex items-center justify-center text-neutral-500">
              Your edited image will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Other;