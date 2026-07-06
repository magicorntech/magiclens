import type { ThemeConfig } from 'antd'

// Matches Ant Design's own default seed tokens (colorPrimary/borderRadius),
// stated explicitly rather than left implicit, per the official design language.
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 6
  },
  components: {
    // By default antd gives expanded dark-mode submenus a darker background than the
    // menu itself (for nesting cues), which reads as a jarring navy block in our sidebar.
    // Match it to the item background so expanded groups blend into the sidebar.
    Menu: {
      darkSubMenuItemBg: '#001529'
    }
  }
}
