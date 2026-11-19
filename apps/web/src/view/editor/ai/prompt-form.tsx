import { Btn } from '../../component/btn'
import { Segments } from '../../component/segments'
import { useEditorServices } from '../../hooks/use-services'

const examples = ['AI example 1', 'AI example 2', 'AI example 3', 'AI example 4']

export const AiPromptForm = observer(() => {
  const { aiController: ai } = useEditorServices()
  return (
    <>
      <Segments
        value={ai.target}
        options={[
          { label: t('AI new page'), value: 'new' },
          { label: t('AI current page'), value: 'current' },
        ]}
        onChange={(value) => {
          if (typeof value !== 'string') return
          ai.setTarget(value)
        }}
      />
      <textarea
        rows={5}
        value={ai.prompt}
        onChange={(e) => ai.setPrompt(e.target.value)}
        placeholder={t('AI prompt placeholder')}
      />
      <div>
        {examples.map((example) => (
          <button
            className={cls('example')}
            key={example}
            onClick={() => ai.setPrompt(t(example))}>
            {t(example)}
          </button>
        ))}
      </div>
      <Btn variant='solid' disabled={ai.busy} onClick={ai.send}>
        {ai.busy ? t('AI generating') : t('AI send')}
      </Btn>
      {ai.message && <p>{ai.message}</p>}
    </>
  )
})

const cls = classes(css`
  &-example {
    display: block;
    width: 100%;
    text-align: left;
    font-size: 12px;
    line-height: 1.5;
    padding: 5px;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  &-example:hover {
    background: var(--gray-bg);
  }
`)
