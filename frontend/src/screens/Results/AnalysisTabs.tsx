import type { ReactNode } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScroll,
} from '@/components/ui/table'
import type {
  AudienceDemand,
  EvidenceCheck,
  ScriptAnalysis,
  TitleAnalysis,
  Video,
} from '@/lib/types'

// --- shared building blocks ------------------------------------------------

/** Teal sub-section heading (Figma 35:2181 — "Duration Sweet Spot" etc.). */
function AnalysisSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[15px] font-medium text-brand-teal">{title}</h3>
      {children}
    </section>
  )
}

// --- Title Analysis (tab 1) ------------------------------------------------

function TitleAnalysisView({ data }: { data: TitleAnalysis }) {
  return (
    <div className="flex flex-col gap-8">
      <AnalysisSection title="Common Features">
        <TableScroll className="rounded-[12px] border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">№</TableHead>
                <TableHead className="min-w-[200px]">Pattern</TableHead>
                <TableHead className="min-w-[300px]">Note</TableHead>
                <TableHead className="text-right">Videos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.common_features.map((feature) => (
                <TableRow key={feature.n}>
                  <TableCell className="align-top tabular-nums text-brand-grey">
                    {feature.n}
                  </TableCell>
                  <TableCell className="align-top font-medium">{feature.pattern}</TableCell>
                  <TableCell className="align-top text-brand-grey">{feature.note}</TableCell>
                  <TableCell className="align-top whitespace-nowrap text-right tabular-nums text-brand-grey">
                    {feature.count.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableScroll>
      </AnalysisSection>

      <AnalysisSection title="Emotional Triggers Used in the Titles">
        <TableScroll className="rounded-[12px] border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">№</TableHead>
                <TableHead className="min-w-[200px]">Trigger</TableHead>
                <TableHead className="min-w-[320px]">Example</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.emotional_triggers.map((trigger) => (
                <TableRow key={trigger.n}>
                  <TableCell className="align-top tabular-nums text-brand-grey">
                    {trigger.n}
                  </TableCell>
                  <TableCell className="align-top font-medium">{trigger.trigger}</TableCell>
                  <TableCell className="align-top text-brand-grey">{trigger.example}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableScroll>
      </AnalysisSection>
    </div>
  )
}

// --- Script Analysis (tab 2) -----------------------------------------------

function ScriptAnalysisView({ data, videos }: { data: ScriptAnalysis; videos: Video[] }) {
  const byId: Record<string, Video> = {}
  for (const v of videos) byId[v.video_id] = v

  // TRUST RULE: keep only hooks whose video_id resolves to a real Video; render
  // the authoritative title + watch link from that Video (never the free-text).
  const hooks = data.hook_breakdown
    .map((hook) => ({ hook, video: byId[hook.video_id] }))
    .filter((row): row is { hook: ScriptAnalysis['hook_breakdown'][number]; video: Video } =>
      Boolean(row.video),
    )
    .sort((a, b) => a.hook.rank - b.hook.rank)

  return (
    <div className="flex flex-col gap-8">
      {data.duration_sweet_spot.length > 0 && (
        <AnalysisSection title="Duration Sweet Spot">
          <dl className="overflow-hidden rounded-[12px] border border-border text-sm">
            {data.duration_sweet_spot.map((stat, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-6 border-b border-border px-4 py-3 last:border-0"
              >
                <dt className="text-brand-grey">{stat.label}</dt>
                <dd className="text-right font-medium">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </AnalysisSection>
      )}

      {data.structure_patterns.length > 0 && (
        <AnalysisSection title="Content Structure Patterns">
          <div className="overflow-hidden rounded-[12px] border border-border text-sm">
            {data.structure_patterns.map((pattern, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-1 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[minmax(200px,300px)_1fr] sm:gap-6"
              >
                <div className="font-medium">{pattern.name}</div>
                <div className="text-brand-grey">{pattern.note}</div>
              </div>
            ))}
          </div>
        </AnalysisSection>
      )}

      {hooks.length > 0 && (
        <AnalysisSection title="Hook Breakdown (First 30 Seconds)">
          <TableScroll className="rounded-[12px] border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">№</TableHead>
                  <TableHead className="min-w-[220px]">Title</TableHead>
                  <TableHead className="min-w-[300px]">Hook</TableHead>
                  <TableHead className="text-right">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hooks.map(({ hook, video }) => (
                  <TableRow key={hook.video_id}>
                    <TableCell className="align-top tabular-nums text-brand-grey">
                      {hook.rank}
                    </TableCell>
                    <TableCell className="align-top font-medium">{video.title}</TableCell>
                    <TableCell className="align-top text-brand-grey">{hook.hook}</TableCell>
                    <TableCell className="align-top text-right">
                      <a
                        href={video.watch_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-brand-link hover:underline"
                      >
                        Video
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        </AnalysisSection>
      )}

      {data.what_to_avoid.length > 0 && (
        <AnalysisSection title="What to Avoid">
          <ul className="flex flex-col gap-2.5 text-sm">
            {data.what_to_avoid.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-tier-hot" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </AnalysisSection>
      )}
    </div>
  )
}

// --- Pautas & Evidências (Corpo Explicado fork) ------------------------------

function VideoLink({ video }: { video: Video | undefined }) {
  if (!video) return <span className="text-brand-grey">—</span>
  return (
    <a
      href={video.watch_url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-brand-link hover:underline"
      title={video.title}
    >
      Vídeo
    </a>
  )
}

function DemandEvidenceView({
  demand,
  checks,
  videos,
}: {
  demand: AudienceDemand[] | null
  checks: EvidenceCheck[] | null
  videos: Video[]
}) {
  const byId: Record<string, Video> = {}
  for (const v of videos) byId[v.video_id] = v

  return (
    <div className="flex flex-col gap-8">
      <AnalysisSection title="Pautas pedidas pela audiência">
        {demand && demand.length > 0 ? (
          <div className="overflow-hidden rounded-[12px] border border-border text-sm">
            {demand.map((item, i) => (
              <div key={i} className="flex flex-col gap-1.5 border-b border-border px-4 py-3 last:border-0">
                <div className="font-medium">{item.pauta}</div>
                <div className="text-brand-grey">{item.question}</div>
                <div className="flex items-baseline justify-between gap-4">
                  <blockquote className="border-l-2 border-border pl-3 italic text-brand-muted">
                    “{item.comment}”
                  </blockquote>
                  <VideoLink video={byId[item.video_id]} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-muted">
            Nenhuma pauta confirmada por comentários reais nesta pesquisa.
          </p>
        )}
      </AnalysisSection>

      <AnalysisSection title="Checagem de evidência (PubMed)">
        {checks && checks.length > 0 ? (
          <TableScroll className="rounded-[12px] border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">Afirmação no vídeo</TableHead>
                  <TableHead className="min-w-[200px]">Busca</TableHead>
                  <TableHead className="text-right">Artigos</TableHead>
                  <TableHead className="text-right">Vídeo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="align-top font-medium">{c.claim}</TableCell>
                    <TableCell className="align-top text-brand-grey">
                      <a
                        href={c.search_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-link hover:underline"
                      >
                        {c.pubmed_query}
                      </a>
                      {c.pmids && c.pmids.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          {c.pmids.map((pmid) => (
                            <a
                              key={pmid}
                              href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-link hover:underline"
                            >
                              PMID {pmid}
                            </a>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top whitespace-nowrap text-right tabular-nums text-brand-grey">
                      {c.pubmed_hits == null ? '—' : c.pubmed_hits.toLocaleString()}
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <VideoLink video={byId[c.video_id]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        ) : (
          <p className="text-sm text-brand-muted">Nenhuma afirmação de saúde para checar.</p>
        )}
      </AnalysisSection>
    </div>
  )
}

// --- public component ------------------------------------------------------

/**
 * Section C — Title Analysis / Script Analysis tabs (Figma 31:843 + 35:2181).
 *
 * Either analysis is `null` when its Composer toggle was off: that tab is
 * disabled with an inline "(off)" hint, and the active tab defaults to the
 * first available one. When both are null, an empty note is shown instead.
 * Video references (Hook Breakdown) are joined to `videos` by `video_id`.
 */
export function AnalysisTabs({
  titleAnalysis,
  scriptAnalysis,
  audienceDemand = null,
  evidenceChecks = null,
  videos,
}: {
  titleAnalysis: TitleAnalysis | null
  scriptAnalysis: ScriptAnalysis | null
  audienceDemand?: AudienceDemand[] | null
  evidenceChecks?: EvidenceCheck[] | null
  videos: Video[]
}) {
  const hasDemand = audienceDemand !== null || evidenceChecks !== null
  if (!titleAnalysis && !scriptAnalysis && !hasDemand) {
    return (
      <p className="text-sm text-brand-muted">
        No analysis was generated for this run — enable Title or Script analytics before running to
        see these insights.
      </p>
    )
  }

  const defaultTab = titleAnalysis ? 'titles' : scriptAnalysis ? 'script' : 'demand'

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="titles" disabled={!titleAnalysis}>
          Title Analysis
          {!titleAnalysis && <span className="ml-1 font-normal text-brand-grey">(off)</span>}
        </TabsTrigger>
        <TabsTrigger value="script" disabled={!scriptAnalysis}>
          Script Analysis
          {!scriptAnalysis && <span className="ml-1 font-normal text-brand-grey">(off)</span>}
        </TabsTrigger>
        <TabsTrigger value="demand" disabled={!hasDemand}>
          Pautas & Evidências
          {!hasDemand && <span className="ml-1 font-normal text-brand-grey">(off)</span>}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="titles">
        {titleAnalysis ? (
          <TitleAnalysisView data={titleAnalysis} />
        ) : (
          <p className="text-sm text-brand-muted">Title analysis was turned off for this run.</p>
        )}
      </TabsContent>

      <TabsContent value="script">
        {scriptAnalysis ? (
          <ScriptAnalysisView data={scriptAnalysis} videos={videos} />
        ) : (
          <p className="text-sm text-brand-muted">Script analysis was turned off for this run.</p>
        )}
      </TabsContent>

      <TabsContent value="demand">
        {hasDemand ? (
          <DemandEvidenceView demand={audienceDemand} checks={evidenceChecks} videos={videos} />
        ) : (
          <p className="text-sm text-brand-muted">
            Ative a análise de roteiro para minerar comentários e checar evidências.
          </p>
        )}
      </TabsContent>
    </Tabs>
  )
}
