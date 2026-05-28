import { CloudSun, MapPinned, Navigation, Route } from "lucide-react";
import type { Project } from "../../types";

type ProjectMapViewProps = {
  project: Project;
};

export function ProjectMapView({ project }: ProjectMapViewProps) {
  const query = encodeURIComponent(project.address || project.name);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const embedUrl = `https://www.google.com/maps?q=${query}&output=embed`;

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Mapa da obra</h2>
          <p className="muted mt-1">Localizacao, rota rapida e contexto de campo.</p>
        </div>
        <a className="btn-primary flex w-fit items-center gap-2 px-4 py-3 font-bold" href={mapsUrl} target="_blank" rel="noreferrer">
          <Navigation size={18} />
          Navegar
        </a>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_18rem]">
        <iframe className="min-h-[30rem] w-full rounded-3xl border border-[var(--border)]" src={embedUrl} title="Mapa da obra" loading="lazy" />
        <div className="grid content-start gap-3">
          <Info icon={MapPinned} title="Endereco" value={project.address} />
          <Info icon={Route} title="Rotas" value="Abrir no Google Maps para calcular distancia e transito em tempo real." />
          <Info icon={CloudSun} title="Clima" value="Preparado para integrar previsao local por coordenadas." />
        </div>
      </div>
    </section>
  );
}

function Info({ icon: Icon, title, value }: { icon: typeof MapPinned; title: string; value: string }) {
  return (
    <div className="panel-flat rounded-2xl p-4">
      <Icon className="text-[var(--accent-strong)]" size={20} />
      <p className="mt-3 font-black">{title}</p>
      <p className="muted mt-1 text-sm leading-6">{value}</p>
    </div>
  );
}
