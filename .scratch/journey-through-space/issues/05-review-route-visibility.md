# Keep the current route stop visible after viewport changes

Status: ready-for-agent
Blocked by: 01, 02, 03

The route scrolls the current marker into view when the destination changes, but
resize currently calls updateUI with the same selected stop. A desktop→phone
resize at Sagittarius A* may therefore leave the current marker offscreen.
Verify this through the existing browser seam, add a regression, and correct
viewport-change behavior without resetting inspection or progress. Review the
final spec-axis report from root for any additional concrete findings before
finishing. Use TDD, commit the correction, and merge latest integration first.
