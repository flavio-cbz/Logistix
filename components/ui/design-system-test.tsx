import React from 'react';

export function DesignSystemTest() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="typography-display">Design System Test</h1>
      
      {/* Typography Test */}
      <section className="space-y-4">
        <h2 className="typography-heading">Typography</h2>
        <div className="space-y-2">
          <p className="typography-display">Display Text</p>
          <p className="typography-heading">Heading Text</p>
          <p className="typography-subheading">Subheading Text</p>
          <p className="typography-body">Body Text</p>
          <p className="typography-caption">Caption Text</p>
          <p className="typography-small">Small Text</p>
        </div>
      </section>

      {/* Colors Test */}
      <section className="space-y-4">
        <h2 className="typography-heading">Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <div className="h-16 bg-primary-50 rounded border"></div>
            <p className="typography-small">Primary 50</p>
          </div>
          <div className="space-y-2">
            <div className="h-16 bg-primary-100 rounded border"></div>
            <p className="typography-small">Primary 100</p>
          </div>
          <div className="space-y-2">
            <div className="h-16 bg-primary-500 rounded"></div>
            <p className="typography-small">Primary 500</p>
          </div>
          <div className="space-y-2">
            <div className="h-16 bg-success rounded"></div>
            <p className="typography-small">Success</p>
          </div>
          <div className="space-y-2">
            <div className="h-16 bg-warning rounded"></div>
            <p className="typography-small">Warning</p>
          </div>
        </div>
      </section>

      {/* Shadows Test */}
      <section className="space-y-4">
        <h2 className="typography-heading">Enhanced Shadows</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-16 bg-white rounded shadow-enhanced-sm flex items-center justify-center">
            <span className="typography-small">Small</span>
          </div>
          <div className="h-16 bg-white rounded shadow-enhanced-md flex items-center justify-center">
            <span className="typography-small">Medium</span>
          </div>
          <div className="h-16 bg-white rounded shadow-enhanced-lg flex items-center justify-center">
            <span className="typography-small">Large</span>
          </div>
          <div className="h-16 bg-white rounded shadow-enhanced-xl flex items-center justify-center">
            <span className="typography-small">Extra Large</span>
          </div>
        </div>
      </section>

      {/* Gradients Test */}
      <section className="space-y-4">
        <h2 className="typography-heading">Gradients</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-16 bg-gradient-primary rounded flex items-center justify-center">
            <span className="typography-small text-white">Primary</span>
          </div>
          <div className="h-16 bg-gradient-success rounded flex items-center justify-center">
            <span className="typography-small text-white">Success</span>
          </div>
          <div className="h-16 bg-gradient-warning rounded flex items-center justify-center">
            <span className="typography-small text-white">Warning</span>
          </div>
          <div className="h-16 bg-gradient-info rounded flex items-center justify-center">
            <span className="typography-small text-white">Info</span>
          </div>
        </div>
      </section>

      {/* Glass Effect Test */}
      <section className="space-y-4">
        <h2 className="typography-heading">Glass Effect</h2>
        <div className="relative h-32 bg-gradient-primary rounded-lg overflow-hidden">
          <div className="absolute inset-4 glass-effect rounded-lg flex items-center justify-center">
            <span className="typography-body text-white">Glass Effect</span>
          </div>
        </div>
      </section>

      {/* Animations Test */}
      <section className="space-y-4">
        <h2 className="typography-heading">Animations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-16 bg-primary-100 rounded animate-fade-in flex items-center justify-center">
            <span className="typography-small">Fade In</span>
          </div>
          <div className="h-16 bg-primary-100 rounded animate-slide-up flex items-center justify-center">
            <span className="typography-small">Slide Up</span>
          </div>
          <div className="h-16 bg-primary-100 rounded animate-scale-in flex items-center justify-center">
            <span className="typography-small">Scale In</span>
          </div>
        </div>
      </section>
    </div>
  );
}