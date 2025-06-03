# Demo Assets Directory

This directory contains all assets for the demo walkthrough experience.

## Organization Structure

```
/public/assets/demo/
├── steps/                          # Step-specific visual assets
│   ├── step-1-static.png          # Platform Overview - static image
│   ├── step-1-animated.gif        # Platform Overview - animated version
│   ├── step-2-static.png          # Interactive Experience - static image
│   ├── step-2-animated.gif        # Interactive Experience - animated version
│   ├── step-3-static.png          # Results & Insights - static image
│   └── step-3-animated.gif        # Results & Insights - animated version
└── README.md                       # This documentation file
```

## Asset Specifications

- **Image Dimensions**: 220x220 pixels
- **Static Format**: PNG (recommended for quality)
- **Animated Format**: GIF (optimized for web)
- **Naming Convention**: `step-{number}-{type}.{extension}`

## Step Descriptions

1. **Platform Overview**: Introduction to the Invela Trust Network ecosystem
2. **Interactive Experience**: Hands-on demonstration of key platform features  
3. **Results & Insights**: Comprehensive view of assessment outcomes and next steps

## Usage

The system automatically switches between static images (for inactive steps) and animated GIFs (for the current active step) to provide dynamic visual feedback during the demo walkthrough.