import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BUILTIN_PLUGINS, SPARKS_THEMES } from '../Notes/sparksCatalog'
import { useNotesStore } from '../../stores/notesStore'
import { ThemeSchemeCard, SettingsSection, SettingsToggleRow } from './SettingsPrimitives'

export function SparksSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const themeId = useNotesStore((s) => s.themeId)
  const setThemeId = useNotesStore((s) => s.setThemeId)
  const pluginsEnabled = useNotesStore((s) => s.pluginsEnabled)
  const setPluginEnabled = useNotesStore((s) => s.setPluginEnabled)

  const lightThemes = SPARKS_THEMES.filter((th) => th.tone === 'system' || th.tone === 'light')
  const darkThemes = SPARKS_THEMES.filter((th) => th.tone === 'dark')

  return (
    <>
      <SettingsSection
        title={t('settings.sparks.themesTitle')}
        description={t('settings.sparks.themesHint')}
      >
        <div className="ml-settings-theme-group">
          <div className="ml-settings-theme-group__label">{t('settings.sparks.lightThemes')}</div>
          <div className="ml-settings-theme-grid">
            {lightThemes.map((theme) => (
              <ThemeSchemeCard
                key={theme.id}
                name={theme.label}
                description={theme.description}
                swatches={theme.swatch}
                selected={themeId === theme.id}
                onSelect={() => setThemeId(theme.id)}
              />
            ))}
          </div>
        </div>

        <div className="ml-settings-theme-group">
          <div className="ml-settings-theme-group__label">{t('settings.sparks.darkThemes')}</div>
          <div className="ml-settings-theme-grid">
            {darkThemes.map((theme) => (
              <ThemeSchemeCard
                key={theme.id}
                name={theme.label}
                description={theme.description}
                swatches={theme.swatch}
                selected={themeId === theme.id}
                onSelect={() => setThemeId(theme.id)}
              />
            ))}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('settings.sparks.pluginsTitle')}
        description={t('settings.sparks.pluginsHint')}
      >
        <div className="ml-settings-sparks-plugins">
          {BUILTIN_PLUGINS.map((plugin) => (
            <SettingsToggleRow
              key={plugin.id}
              title={plugin.name}
              description={plugin.description}
              checked={pluginsEnabled[plugin.id] !== false}
              onChange={(checked) => setPluginEnabled(plugin.id, checked)}
            />
          ))}
        </div>
      </SettingsSection>

      <p className="ml-settings-sparks-foot">
        <Sparkles size={14} aria-hidden />
        {t('settings.sparks.localHint')}
      </p>
    </>
  )
}
