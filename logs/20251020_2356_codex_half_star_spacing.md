# [20251020_2356] Half-Star Spacing Fix

**Agent:** Codex  
**Branch:** pending commit  
**Commit:** pending commit  

## Purpose
- Ensure half-star glyphs reserve the same horizontal space as full stars so blank-star icons no longer stick to them visually.

## Files Modified
- components/StarRating.tsx

## Summary of Edits
- Force the half-star wrapper and mask to adopt the current star `size` for both width and height, guaranteeing a full-star footprint.
- Anchored the empty-star outline and clipping mask to the top-left so the filled half renders flush while keeping the opposite half transparent.
- Retained container alignment to keep existing layout but now relies on standard row `gap` for spacing.

## Key Diff (condensed)
```diff
- <View style={[styles.halfStarContainer, { marginRight: 2 }]}>
+ <View style={[styles.halfStarContainer, { width: size, height: size }]}>
+   …
+   <View style={[styles.halfStarMask, { width: size / 2, height: size }]}>
- const styles = StyleSheet.create({ halfStarContainer: { position: 'relative' } });
+ const styles = StyleSheet.create({ halfStarContainer: { position: 'relative', justifyContent: 'center', alignItems: 'center' } });
+ halfStarEmpty: { position: 'absolute', left: 0, top: 0 }
+ halfStarMask: { overflow: 'hidden', alignItems: 'flex-start' }
```

## Notes
- Visual verification still recommended in the simulator to confirm spacing at all star sizes.
