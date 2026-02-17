# Power BI Visual Styling Guide
## Professional Formatting for MCP-Created Dashboards

Based on analysis of professional Power BI reports, here are the key styling elements to make visuals look polished.

---

## 1. Visual Container Objects (Overall Visual Styling)

### Drop Shadows (Essential for Professional Look)
Always add drop shadows to make visuals stand out:

```json
"visualContainerObjects": {
  "dropShadow": [
    {
      "properties": {
        "show": {
          "expr": {
            "Literal": {
              "Value": "true"
            }
          }
        }
      }
    }
  ]
}
```

### Title Formatting
Use larger font sizes (14-16D) for titles:

```json
"title": [
  {
    "properties": {
      "text": {
        "expr": {
          "Literal": {
            "Value": "'Your Title Here'"
          }
        }
      },
      "fontSize": {
        "expr": {
          "Literal": {
            "Value": "16D"
          }
        }
      }
    }
  }
]
```

---

## 2. Table/Matrix Specific Styling

### Data Bars (In-Cell Charts)
Add data bars to value columns for visual comparison:

```json
"objects": {
  "columnFormatting": [
    {
      "properties": {
        "dataBars": {
          "positiveColor": {
            "solid": {
              "color": {
                "expr": {
                  "Literal": {
                    "Value": "'#c4d3e9'"
                  }
                }
              }
            }
          },
          "negativeColor": {
            "solid": {
              "color": {
                "expr": {
                  "Literal": {
                    "Value": "'minColor'"
                  }
                }
              }
            }
          },
          "axisColor": {
            "solid": {
              "color": {
                "expr": {
                  "Literal": {
                    "Value": "'foreground'"
                  }
                }
              }
            }
          },
          "reverseDirection": {
            "expr": {
              "Literal": {
                "Value": "false"
              }
            }
          },
          "hideText": {
            "expr": {
              "Literal": {
                "Value": "false"
              }
            }
          }
        }
      },
      "selector": {
        "metadata": "Sum(Sales.Sales Amount)"
      }
    }
  ]
}
```

### Column Widths
Set custom column widths for better readability:

```json
"columnWidth": [
  {
    "properties": {
      "value": {
        "expr": {
          "Literal": {
            "Value": "893.5191749529135D"
          }
        }
      }
    },
    "selector": {
      "metadata": "Sum(Sales.Sales Amount)"
    }
  }
]
```

---

## 3. Slicer Styling

### Text Size
Increase header text size:

```json
"header": [
  {
    "properties": {
      "textSize": {
        "expr": {
          "Literal": {
            "Value": "16D"
          }
        }
      }
    }
  }
]
```

### Select All Checkbox
Enable "Select All" for better UX:

```json
"selection": [
  {
    "properties": {
      "selectAllCheckboxEnabled": {
        "expr": {
          "Literal": {
            "Value": "true"
          }
        }
      }
    }
  }
]
```

---

## 4. Query Best Practices

### Use Hierarchies for Slicers
Instead of plain columns, use hierarchies for drill-down capability:

```json
"field": {
  "HierarchyLevel": {
    "Expression": {
      "Hierarchy": {
        "Expression": {
          "SourceRef": {
            "Entity": "Date"
          }
        },
        "Hierarchy": "Fiscal"
      }
    },
    "Level": "Year"
  }
}
```

### Add Active Flags
Mark projections as active:

```json
"projections": [
  {
    "field": { ... },
    "queryRef": "Product.Category",
    "active": true
  }
]
```

### Enable Cross-Filtering
Add drill filtering to enable visual interactions:

```json
"drillFilterOtherVisuals": true
```

---

## 5. Color Palette

### Professional Color Scheme
Use these colors for consistency:
- **Primary Data Color**: `#118DFF` (Blue)
- **Secondary Color**: `#c4d3e9` (Light Blue)
- **Accent Color**: `#E66C37` (Orange/Red)
- **Background**: `#FFFFFF` (White)
- **Text**: `#252423` (Dark Gray)

---

## 6. Common Visual Types & Their Settings

### Card Visuals
```json
"objects": {
  "labels": [
    {
      "properties": {
        "fontSize": {
          "expr": {
            "Literal": {
              "Value": "40D"
            }
          }
        }
      }
    }
  ]
}
```

### Bar/Column Charts
```json
"objects": {
  "dataPoint": [
    {
      "properties": {
        "fill": {
          "solid": {
            "color": {
              "expr": {
                "Literal": {
                  "Value": "'#118DFF'"
                }
              }
            }
          }
        }
      }
    }
  ],
  "categoryAxis": [
    {
      "properties": {
        "fontSize": {
          "expr": {
            "Literal": {
              "Value": "12D"
            }
          }
        }
      }
    }
  ]
}
```

---

## 7. Implementation Checklist

When creating new visuals, always include:

- [ ] Drop shadow enabled
- [ ] Title font size 14-16D
- [ ] Active flags on query projections
- [ ] Cross-filtering enabled (`drillFilterOtherVisuals: true`)
- [ ] Data bars for numeric columns in tables/matrices
- [ ] Custom column widths for tables
- [ ] Consistent color palette
- [ ] Appropriate font sizes (12-16D)
- [ ] Select All checkbox for slicers
- [ ] Hierarchies instead of plain columns where available

---

## 8. Example: Complete Professional Visual

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json",
  "name": "VisualContainer",
  "position": {
    "x": 0,
    "y": 50,
    "width": 600,
    "height": 300,
    "z": 0
  },
  "visual": {
    "visualType": "barChart",
    "query": {
      "queryState": {
        "Category": {
          "projections": [
            {
              "field": {
                "Column": {
                  "Expression": {
                    "SourceRef": {
                      "Entity": "Product"
                    }
                  },
                  "Property": "Category"
                }
              },
              "queryRef": "Product.Category",
              "active": true
            }
          ]
        },
        "Y": {
          "projections": [
            {
              "field": {
                "Aggregation": {
                  "Expression": {
                    "Column": {
                      "Expression": {
                        "SourceRef": {
                          "Entity": "Sales"
                        }
                      },
                      "Property": "Sales Amount"
                    }
                  },
                  "Function": 0
                }
              },
              "queryRef": "Sum(Sales.Sales Amount)",
              "active": true
            }
          ]
        }
      }
    },
    "objects": {
      "dataPoint": [
        {
          "properties": {
            "fill": {
              "solid": {
                "color": {
                  "expr": {
                    "Literal": {
                      "Value": "'#118DFF'"
                    }
                  }
                }
              }
            }
          }
        }
      ]
    },
    "visualContainerObjects": {
      "title": [
        {
          "properties": {
            "text": {
              "expr": {
                "Literal": {
                  "Value": "'Sales by Category'"
                }
              }
            },
            "fontSize": {
              "expr": {
                "Literal": {
                  "Value": "16D"
                }
              }
            }
          }
        }
      ],
      "dropShadow": [
        {
          "properties": {
            "show": {
              "expr": {
                "Literal": {
                  "Value": "true"
                }
              }
            }
          }
        }
      ]
    },
    "drillFilterOtherVisuals": true
  }
}
```

---

## 9. Quick Reference: Object Property Names

| Visual Element | Property Path |
|----------------|---------------|
| Drop Shadow | `visualContainerObjects.dropShadow[0].properties.show` |
| Title Text | `visualContainerObjects.title[0].properties.text` |
| Title Font Size | `visualContainerObjects.title[0].properties.fontSize` |
| Data Color | `objects.dataPoint[0].properties.fill.solid.color` |
| Data Bars | `objects.columnFormatting[0].properties.dataBars` |
| Column Width | `objects.columnWidth[0].properties.value` |
| Slicer Text Size | `objects.header[0].properties.textSize` |
| Select All | `objects.selection[0].properties.selectAllCheckboxEnabled` |

---

## 10. Future MCP Enhancement Ideas

To automate professional styling, the MCP tools could:

1. Add a `styling` parameter to visual creation functions with presets:
   - `"professional"` - Applies all best practices
   - `"minimal"` - Basic styling
   - `"custom"` - User-defined

2. Create template functions:
   - `create_professional_card()`
   - `create_professional_table()`
   - `create_professional_chart()`

3. Add a `apply_theme()` function to update all visuals on a page

---

## 11. Complete Visual Examples

For full, copy-paste ready JSON examples of all visual types, see:
**→ [VISUAL_EXAMPLES.md](./VISUAL_EXAMPLES.md)**

This companion document includes complete JSON templates for:
- Area Chart (Multi-Series)
- Map Visual
- Pivot Table/Matrix with Data Bars
- Hierarchical Slicer
- Bar Chart
- Column Chart
- Table Visual
- Card Visual
- Donut Chart
- Line Chart

Each example is production-ready and can be copied directly into your report definition files.

---

**Last Updated**: 2026-01-29
**Based on**: Adventure Works Sales Sample Report Analysis
**Companion Document**: VISUAL_EXAMPLES.md
