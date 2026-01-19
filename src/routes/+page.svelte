<script>
  // Other imports
  // Removed: import MarineTrafficPanel from '...';
</script>

// ... other code ...

// Removed Marine Traffic panel block (lines 544-549)

// Move Fishing Map and Global Fishing Watch Panels to before the Custom Monitors panel.
// Fishing Map Panel
<FishingMapPanel />

// Global Fishing Watch Panel
<GlobalFishingWatchPanel />

// Custom Monitors panel
<CustomMonitorsPanel />

// Replace BloombergFeedPanel with YouTube iframe
<iframe width="1547" height="869" src="https://www.youtube.com/embed/iEpJwprxDdk" title="Bloomberg Business News Live" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

// ... other code ...