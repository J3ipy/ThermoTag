"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";

export function PhotoEvidence({ photo, sample, onChange }: { photo: string; sample: string; onChange: (photo: string, sample: string) => void }) {
  const [message, setMessage] = useState("");
  const image = useRef<HTMLImageElement>(null);
  const choose = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Escolha uma imagem válida."); return; }
    try {
      const bitmap = "createImageBitmap" in window ? await createImageBitmap(file) : await new Promise<HTMLImageElement>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const fallback = new Image();
        fallback.onload = () => { URL.revokeObjectURL(url); resolve(fallback); };
        fallback.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Foto inválida")); };
        fallback.src = url;
      });
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      if ("close" in bitmap) bitmap.close();
      let result = "";
      for (let quality = 0.72; quality >= 0.31; quality -= 0.1) {
        result = canvas.toDataURL("image/jpeg", quality);
        if (result.length < 230000) break;
      }
      if (result.length > 230000) { setMessage("Foto grande demais. Aproxime a câmera e tente novamente."); return; }
      onChange(result, "");
      setMessage("Toque no centro do indicador na foto para selecionar a área de cor.");
    } catch { setMessage("Não foi possível abrir a foto. Tente outra imagem."); }
  };
  const pick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!image.current) return;
    const rect = image.current.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / rect.width * image.current.naturalWidth);
    const y = Math.floor((event.clientY - rect.top) / rect.height * image.current.naturalHeight);
    const canvas = document.createElement("canvas"); canvas.width = 11; canvas.height = 11;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(image.current, x - 5, y - 5, 11, 11, 0, 0, 11, 11);
    const pixels = context.getImageData(0, 0, 11, 11).data;
    const sums = [0, 0, 0];
    for (let index = 0; index < pixels.length; index += 4) for (let channel = 0; channel < 3; channel++) sums[channel] += pixels[index + channel];
    const hex = `#${sums.map(value => Math.round(value / 121).toString(16).padStart(2, "0")).join("")}`;
    onChange(photo, hex);
    setMessage(`Cor selecionada: ${hex}. Confira a classificação abaixo.`);
  };
  return <div className="photo-evidence"><label className="field">Foto do indicador térmico
    <span className="camera-input"><Camera size={18}/> {photo ? "Substituir foto" : "Tirar foto ou escolher imagem"}</span>
    <input type="file" accept="image/*" capture="environment" onChange={event => void choose(event.target.files?.[0])} /></label>
    {photo && <img ref={image} src={photo} alt="Foto do indicador; toque na região colorida para medir a cor" onClick={pick} />}
    {sample && <p className="sample-color"><span style={{ background: sample }}/>{sample}</p>}
    <p className="helper-note" role="status">{message || "Fotografe o indicador com boa luz e toque na área que mudou de cor."}</p>
  </div>;
}
