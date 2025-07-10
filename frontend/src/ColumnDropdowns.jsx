import React from 'react';
import { Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

// Helper to get label for each dropdown slot
function getLabel(idx, arr, chartType, columns) {
  if (["bar", "horizontalBar"].includes(chartType)) {
    return arr.length === 2 ? (idx === 0 ? "Category" : "Value") : "Category";
  }
  if (["pie", "donut"].includes(chartType)) {
    if (arr.length === 2) return idx === 0 ? "Category" : "Value";
    if (arr.length === 1) return arr[0].some(c => columns.find(col => col.name === c)?.group === 'Numerical') ? "Value" : "Category";
    return `Column ${idx + 1}`;
  }
  if (["groupedBar", "stackedBar"].includes(chartType)) {
    return ["Group", "Subgroup", "Value"][idx] || `Column ${idx + 1}`;
  }
  if (["scatter", "line", "correlation"].includes(chartType)) {
    return ["X Axis", "Y Axis", "Value"][idx] || `Column ${idx + 1}`;
  }
  return `Column ${idx + 1}`;
}

const ColumnDropdowns = ({
  chartType,
  columns,
  combos,
  chartColumns,
  setChartColumns
}) => {
  // Always show both dropdowns for bar/horizontalBar/pie/donut (category and value),
  // but allow user to generate chart if only category is selected.
  let slotOptions;
  let maxCombo = combos.reduce((a, b) => (a.length > b.length ? a : b), []);
  if (["bar", "horizontalBar", "pie", "donut"].includes(chartType)) {
    // Force two slots: category and value
    if (maxCombo.length === 1) {
      // If only one slot in maxCombo, add a second slot for value (numerical columns)
      const catSlot = maxCombo[0];
      const numSlot = columns.filter(c => c.group === 'Numerical').map(c => c.name);
      maxCombo = [catSlot, numSlot];
    }
  }
  slotOptions = maxCombo.map((_, idx) => {
    const colSet = new Set();
    combos.forEach(combo => {
      if (combo[idx]) combo[idx].forEach(c => colSet.add(c));
    });
    return Array.from(colSet);
  });
  // Validation: allow if only first (category or numeric) is selected for bar/horizontalBar/pie/donut
  let isValidSelection = combos.some(combo => {
    if (combo.length !== chartColumns.length) return false;
    return combo.every((slot, idx) => slot.includes(chartColumns[idx]));
  });
  if (["bar", "horizontalBar"].includes(chartType)) {
    // Allow if only first dropdown is filled (category), and second is blank
    if (
      chartColumns.length === 2 &&
      chartColumns[0] &&
      (!chartColumns[1] || chartColumns[1] === '') &&
      slotOptions[0].includes(chartColumns[0])
    ) {
      isValidSelection = true;
    }
  }
  if (["pie", "donut"].includes(chartType)) {
    // Allow if only first dropdown is filled (category or numeric), and second is blank
    if (
      chartColumns.length === 2 &&
      chartColumns[0] &&
      (!chartColumns[1] || chartColumns[1] === '') &&
      (slotOptions[0].includes(chartColumns[0]) || slotOptions[1].includes(chartColumns[0]))
    ) {
      isValidSelection = true;
    }
  }

  return (
    <Grid container spacing={2} alignItems="center" justifyContent="flex-start">
      {slotOptions.map((options, idx) => {
        // Only allow one selection per dropdown (except for correlation multi-select)
        const uniqueColNames = options.filter(colName => {
          if (Array.isArray(chartColumns[idx])) return true;
          return !chartColumns.some((selected, i) => i !== idx && selected === colName);
        });
        const isMulti = chartType === 'correlation' && idx === 1 && options.length > 1;
        return (
          <Grid item xs={12} sm={6} md={4} key={idx}>
            <FormControl fullWidth sx={{ mb: 2, minWidth: 180 }} size="medium">
              <InputLabel sx={{ fontSize: 18 }}>{getLabel(idx, maxCombo, chartType, columns)}</InputLabel>
              <Select
                multiple={isMulti}
                value={chartColumns[idx] || (isMulti ? [] : '')}
                label={getLabel(idx, maxCombo, chartType, columns)}
                onChange={e => {
                  const newCols = [...chartColumns];
                  newCols[idx] = e.target.value;
                  setChartColumns(newCols);
                }}
                renderValue={selected => Array.isArray(selected) ? selected.join(', ') : selected}
                sx={{ fontSize: 18, minHeight: 56 }}
              >
                {uniqueColNames.map(colName => (
                  <MenuItem key={colName} value={colName} sx={{ fontSize: 17 }}>
                    {colName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default ColumnDropdowns;
