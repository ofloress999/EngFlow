import { Film, ImagePlus, PlaySquare } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { fileToDataUrl } from "../../utils/files";

type VideoItem = {
  id: string;
  name: string;
  url: string;
  sizeMb: number;
};

export function VideosView() {
  const [videos, setVideos] = useState<VideoItem[]>([]);

  async function handleVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setVideos((current) => [
      {
        id: crypto.randomUUID(),
        name: file.name,
        url,
        sizeMb: Number((file.size / 1024 / 1024).toFixed(2)),
      },
      ...current,
    ]);
  }

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Videos da obra</h2>
          <p className="muted mt-1">Preview, thumbnail do player e preparo para streaming/compressao.</p>
        </div>
        <label className="btn-primary flex w-fit cursor-pointer items-center gap-2 px-4 py-3 font-bold">
          <ImagePlus size={18} />
          Upload
          <input className="sr-only" type="file" accept="video/*" onChange={handleVideo} />
        </label>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {videos.map((video) => (
          <article className="panel-flat overflow-hidden rounded-2xl" key={video.id}>
            <video className="max-h-80 w-full bg-black object-contain" src={video.url} controls preload="metadata" />
            <div className="p-4">
              <p className="font-black">{video.name}</p>
              <p className="muted mt-1 text-sm">{video.sizeMb} MB | streaming local preview</p>
            </div>
          </article>
        ))}
        {videos.length === 0 && (
          <div className="surface-soft grid min-h-64 place-items-center rounded-3xl p-6 text-center">
            <div>
              <Film className="mx-auto text-[var(--accent-strong)]" size={42} />
              <p className="mt-3 font-black">Nenhum video enviado</p>
              <p className="muted mt-1 text-sm">Envie relatorios rapidos ou explicacoes tecnicas.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
