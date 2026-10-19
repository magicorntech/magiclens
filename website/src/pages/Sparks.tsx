import {CardGrid, Feature, PageHero, Shots } from '../ui'

export function Sparks(): React.JSX.Element {
  return (
    <>
      <PageHero
        kicker={'Sparks · Notes'}
        title={'Notes that live'}
        em={'next to your clusters.'}
        lede={'Runbooks, incident notes and handoffs in Markdown — linked with [[wiki links]], pinned to a cluster, namespace or resource, with reminders and a graph of how it all connects.'}
        video="sparks"
      />

      <div className="features">
        <Feature
          video="sparks"
          kicker={'Write'}
          title={'Runbooks that read well.'}
          copy={'Headings, tables, checklists and code blocks render cleanly in Read mode, and you can switch to Write or Live preview any time. Notes autosave as you type.'}
          bullets={[
            'Write, Live and Read modes',
            'Tables, checklists and code',
            'Paper styles and widths'
          ]}
        />
        <Shots
          items={[
            { id: 'feat-sparks-start', cap: 'A hub note' },
            { id: 'feat-sparks-runbook', cap: 'A runbook with gates' },
            { id: 'feat-sparks-incident', cap: 'An incident note' }
          ]}
        />

        <section className="band-head center">
          <span className="kicker">{'Connect'}</span>
          <h2>{'Link ideas. See the map.'}</h2>
          <p>
            {'Type [[ to link another note. Backlinks show up automatically, and the graph draws the whole notebook.'}
          </p>
        </section>
        <Shots
          cols={2}
          items={[
            { id: 'feat-sparks-split-graph', cap: 'Editor and graph, side by side' },
            { id: 'feat-sparks-graph', cap: 'The link graph' }
          ]}
        />

        <Feature
          video="sparks-attached"
          kicker={'Attach'}
          title={'Pin a note to the thing it is about.'}
          copy={'Scope a note to a cluster, a namespace or a single resource. Open the deployment and its notes are in a tab beside Events and YAML — the incident write-up is right where you need it.'}
          bullets={[
            'Cluster, namespace and resource scopes',
            'Notes appear in the resource panel',
            'Jump back to the note in one click'
          ]}
          flip
        />
        <Shots cols={2} items={[
          { id: 'feat-sparks-attached', cap: 'Notes inside a deployment' },
          { id: 'feat-sparks-sizing', cap: 'A cluster-scoped note' }
        ]} />

        <section className="band-head center">
          <span className="kicker">{'Everything else'}</span>
          <h2>{'Built for the way on-call actually works.'}</h2>
        </section>
        <CardGrid
          items={[
            { title: 'Reminders', copy: 'Set a reminder on any note; upcoming ones show in the sidebar.' },
            { title: 'Tags and folders', copy: 'Organise with folders and #tags, pin what matters, search everything.' },
            { title: 'Templates', copy: 'Start from a ready-made structure for runbooks, incidents and handoffs.' },
            { title: 'Draw on the page', copy: 'Pen, highlighter, shapes and attachments right on the note.' },
            { title: 'Command palette', copy: 'Press Cmd+K to jump to any note, cluster or resource.' },
            { title: 'Plain Markdown on disk', copy: 'Your vault is just a folder of .md files — open it in any editor, back it up, sync it.' }
          ]}
        />
      </div>
    </>
  )
}
