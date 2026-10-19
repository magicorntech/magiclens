import {CardGrid, Feature, PageHero, Shots, Window, Clip } from '../ui'

export function Molly(): React.JSX.Element {
  return (
    <>
      <PageHero
        kicker={'Molly · AI assistant'}
        title={'Ask the cluster.'}
        em={'Get an answer, not a command.'}
        lede={'Molly reads your Kubernetes clusters for you — nodes, events, logs, metrics, security — and answers in chat or by voice with charts, tables and short recommendations. She is strictly read-only.'}
        video="molly"
      />

      <div className="features">
        <section className="band-head center">
          <span className="kicker">{'How it works'}</span>
          <h2>{'Three steps. No kubectl.'}</h2>
        </section>
        <CardGrid
          items={[
            {
              title: '1 · Ask',
              copy: 'Type, or just talk. “What is wrong with aurora-prod?” “Show warning events from the last hour.”'
            },
            {
              title: '2 · She looks',
              copy: 'Molly picks from nine read-only tools and runs them against the cluster you are looking at.'
            },
            {
              title: '3 · You read',
              copy: 'A short answer with recommendations, plus the chart, table or log behind it.'
            }
          ]}
        />

        <Feature
          video="molly"
          kicker={'Answers'}
          title={'Charts and tables, not walls of text.'}
          copy={'Ask about health and she summarises what is degraded and why. Ask about events and you get a table. Ask about nodes and you get CPU and memory charts. CPU is always in mCPU, memory in Mi or Gi.'}
          bullets={[
            'Health summaries with findings',
            'Event tables you can scan in seconds',
            'Node and pod metric charts'
          ]}
        />
        <Shots
          items={[
            { id: 'feat-molly-health', cap: 'What is wrong with the cluster?' },
            { id: 'feat-molly-events', cap: 'Warning events, as a table' },
            { id: 'feat-molly-nodes', cap: 'The busiest nodes, as charts' }
          ]}
        />

        <section className="band-head center">
          <span className="kicker">{'What she can read'}</span>
          <h2>{'Nine tools. Zero write access.'}</h2>
        </section>
        <CardGrid
          items={[
            { title: 'Cluster health', copy: 'Ready nodes, failed pods, CPU and memory headroom.' },
            { title: 'Node metrics', copy: 'CPU and memory per node, with capacity.' },
            { title: 'Pod metrics', copy: 'Usage per pod or per namespace.' },
            { title: 'Events', copy: 'Warnings and normals, filterable by time and text.' },
            { title: 'Logs', copy: 'The tail of any container, filterable by keyword.' },
            { title: 'Any resource kind', copy: 'Lists and inspects any kind the cluster advertises — including CRDs.' },
            { title: 'Usage', copy: 'Where CPU, memory and storage actually go.' },
            { title: 'Security', copy: 'Reads the latest scan and explains the findings.' },
            { title: 'Anomaly summary', copy: 'Combines health, events and metrics into a short list of what looks wrong.' }
          ]}
        />

        <Feature
          video="molly-panel"
          kicker={'Beside the page'}
          title={'Molly rides along with whatever you are looking at.'}
          copy={'Open her panel next to any page. Tap “Explain this page” or “Help me debug from events” and she answers about exactly what is on screen — in the same conversation as the Molly page.'}
          bullets={[
            'Knows the cluster, namespace and page',
            'One shared chat history',
            'Suggested prompts to start'
          ]}
          flip
        />
        <Shots
          cols={2}
          items={[
            { id: 'feat-molly-panel', cap: 'Explain this page' },
            { id: 'feat-molly-panel-events', cap: 'Debug from events' }
          ]}
        />

        <Feature
          video="molly-settings"
          kicker={'Your model, your rules'}
          title={'Bring the model you already trust.'}
          copy={'Choose the provider that answers: local Ollama for fully offline use, OpenAI, Claude, Google Gemini or a local CLI. Every provider has a setup runbook in AI settings, and your keys stay on this device.'}
          bullets={[
            'Local-first with Ollama',
            'Voice chat with Google Gemini',
            'Preferences for voice, wake word and startup checks'
          ]}
        />
        <Shots
          items={[
            { id: 'feat-molly-hub', cap: 'The Molly hub' },
            { id: 'feat-ai-settings', cap: 'AI settings' },
            { id: 'feat-molly-preferences', cap: 'Preferences' }
          ]}
        />

        <section className="callout">
          <div>
            <span className="kicker">{'Safety'}</span>
            <h3>{'Read-only, by design.'}</h3>
            <p>
              {'Molly has no tool that can create, change or delete anything — and any tool name that looks like a mutation is refused before it runs. She never navigates your tabs on her own and never scans clusters unless you turn startup checks on.'}
            </p>
          </div>
          <Window>
            <Clip name="molly" label="Molly" />
          </Window>
        </section>
      </div>
    </>
  )
}
