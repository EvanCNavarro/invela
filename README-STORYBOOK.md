# 🎨 Storybook Design System Setup

Your enterprise risk assessment platform now has a comprehensive design system accessible via subdomain!

## 🚀 Quick Access

### Development Mode
```bash
npx storybook dev -p 6006
```
Then visit: `http://localhost:6006`

### Production Subdomain
Once deployed, your design system will be available at:
```
https://storybook.your-domain.replit.app
```

## 📁 What's Included

### Component Library
- **Enhanced Table** - Sortable, selectable data tables with professional styling
- **Button Components** - Complete button variants (primary, secondary, outline, ghost)
- **Form Inputs** - Validated input components with error states
- **Design System Guidelines** - Typography, colors, spacing standards

### Interactive Features
- **Component Playground** - Live editing and testing of props
- **Accessibility Testing** - Built-in a11y compliance checking
- **Responsive Preview** - Mobile, tablet, desktop breakpoints
- **Dark/Light Themes** - Complete theme switching capability

## 🔧 Technical Implementation

### Server Integration
Your Express server now includes:
- Subdomain routing for `storybook.your-domain.replit.app`
- Static file serving for built Storybook assets
- Development fallback routes

### Build Process
```bash
npx storybook build -o storybook-static
```

### File Structure
```
storybook-static/          # Built files for deployment
├── .replit-subdomain      # Subdomain configuration
├── index.html            # Main Storybook app
└── static/               # CSS, JS, and asset files
```

## 🎯 Next Steps

1. **Deploy Your App** - The subdomain will automatically work once deployed
2. **Share with Team** - Send the storybook subdomain URL to developers and designers
3. **Component Development** - Use Storybook for isolated component development
4. **Design Reviews** - Perfect for design system documentation and reviews

## 💡 Pro Tips

- Stories are automatically discovered from the `stories/` directory
- Use the Controls panel to test different component states
- The Accessibility tab shows compliance issues in real-time
- Viewport addon lets you test responsive behavior

Your design system is now professional-grade and ready for team collaboration!