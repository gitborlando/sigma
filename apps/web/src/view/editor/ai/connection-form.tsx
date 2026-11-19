import { useEditorServices } from '../../hooks/use-services'

export const AiConnectionForm = observer(() => {
  const { aiController: ai } = useEditorServices()
  return (
    <>
      <label>
        {t('AI endpoint')}
        <input
          value={ai.config.baseURL}
          onChange={(e) => ai.setConfig('baseURL', e.target.value)}
        />
      </label>
      <label>
        {t('AI model')}
        <input
          value={ai.config.model}
          onChange={(e) => ai.setConfig('model', e.target.value)}
        />
      </label>
      <label>
        API Key
        <input
          type='password'
          value={ai.config.apiKey}
          onChange={(e) => ai.setConfig('apiKey', e.target.value)}
        />
      </label>
      <small>{t('AI key notice')}</small>
    </>
  )
})
