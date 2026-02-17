# Power BI Visual Examples - Complete JSON Templates
## Ready-to-Copy Professional Visual Configurations

This document provides complete, working JSON examples for all major Power BI visual types with professional styling applied.

---

## Table of Contents
1. [Area Chart (Multi-Series)](#1-area-chart-multi-series)
2. [Map Visual](#2-map-visual)
3. [Pivot Table/Matrix with Data Bars](#3-pivot-tablematrix-with-data-bars)
4. [Hierarchical Slicer](#4-hierarchical-slicer)
5. [Bar Chart](#5-bar-chart)
6. [Column Chart](#6-column-chart)
7. [Table Visual](#7-table-visual)
8. [Card Visual](#8-card-visual)
9. [Donut Chart](#9-donut-chart)
10. [Line Chart](#10-line-chart)

---

## 1. Area Chart (Multi-Series)

**Use Case**: Trend analysis with multiple measures over time

**Features**:
- Hierarchy-based date axis (Month from Fiscal hierarchy)
- Two data series (Sales Amount + calculated measure)
- Theme color for secondary series
- Professional styling with drop shadow

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json",
  "name": "AreaChartExample",
  "position": {
    "x": 160,
    "y": 50,
    "z": 0,
    "height": 250,
    "width": 540
  },
  "visual": {
    "visualType": "areaChart",
    "query": {
      "queryState": {
        "Category": {
          "projections": [
            {
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
                  "Level": "Month"
                }
              },
              "queryRef": "Date.Fiscal.Month",
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
              "queryRef": "Sum(Sales.Sales Amount)"
            },
            {
              "field": {
                "Measure": {
                  "Expression": {
                    "SourceRef": {
                      "Entity": "Sales"
                    }
                  },
                  "Property": "Sales Amount by Due Date"
                }
              },
              "queryRef": "Sales.Sales Amount by Due Date"
            }
          ]
        }
      },
      "sortDefinition": {
        "sort": [
          {
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
                "Level": "Month"
              }
            },
            "direction": "Ascending"
          }
        ],
        "isDefaultSort": true
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
                    "ThemeDataColor": {
                      "ColorId": 5,
                      "Percent": 0
                    }
                  }
                }
              }
            }
          },
          "selector": {
            "metadata": "Sales.Sales Amount by Due Date"
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
                  "Value": "'Sales Amount by Order Date / Due Date'"
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

**Customization Points**:
- Replace `"Entity": "Date"` with your date table name
- Replace `"Hierarchy": "Fiscal"` with your hierarchy name
- Replace `"Entity": "Sales"` with your fact table name
- Replace measure names with your measures

---

## 2. Map Visual

**Use Case**: Geographic analysis with bubble sizes

**Features**:
- Grayscale map theme (professional look)
- Bubble size by aggregated measure
- Location by country/region field
- Drop shadow and title styling

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json",
  "name": "MapExample",
  "position": {
    "x": 720,
    "y": 50,
    "z": 1000,
    "height": 250,
    "width": 550
  },
  "visual": {
    "visualType": "map",
    "query": {
      "queryState": {
        "Category": {
          "projections": [
            {
              "field": {
                "Column": {
                  "Expression": {
                    "SourceRef": {
                      "Entity": "Reseller"
                    }
                  },
                  "Property": "Country-Region"
                }
              },
              "queryRef": "Reseller.Country-Region",
              "active": true
            }
          ]
        },
        "Size": {
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
                      "Property": "Order Quantity"
                    }
                  },
                  "Function": 0
                }
              },
              "queryRef": "Sum(Sales.Order Quantity)"
            }
          ]
        }
      }
    },
    "objects": {
      "mapStyles": [
        {
          "properties": {
            "mapTheme": {
              "expr": {
                "Literal": {
                  "Value": "'grayscale'"
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
                  "Value": "'Order Quantity by Reseller Country'"
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

**Map Theme Options**:
- `'road'` - Standard map view
- `'aerial'` - Satellite view
- `'dark'` - Dark theme
- `'grayscale'` - Professional grayscale (recommended)

**Customization Points**:
- Replace `"Entity": "Reseller"` with your dimension table
- Replace `"Property": "Country-Region"` with your location column
- Replace measure in "Size" section

---

## 3. Pivot Table/Matrix with Data Bars

**Use Case**: Hierarchical data with visual indicators

**Features**:
- Two-level row hierarchy (Category → Subcategory)
- Data bars in value column (light blue bars)
- Custom column width
- Professional formatting

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json",
  "name": "MatrixExample",
  "position": {
    "x": 160,
    "y": 320,
    "z": 2000,
    "height": 380,
    "width": 1110
  },
  "visual": {
    "visualType": "pivotTable",
    "query": {
      "queryState": {
        "Rows": {
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
            },
            {
              "field": {
                "Column": {
                  "Expression": {
                    "SourceRef": {
                      "Entity": "Reseller"
                    }
                  },
                  "Property": "Business Type"
                }
              },
              "queryRef": "Reseller.Business Type",
              "active": true
            }
          ]
        },
        "Values": {
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
              "queryRef": "Sum(Sales.Sales Amount)"
            }
          ]
        }
      }
    },
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
      ],
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
    },
    "visualContainerObjects": {
      "title": [
        {
          "properties": {
            "text": {
              "expr": {
                "Literal": {
                  "Value": "'Sales Amount by Category and Business Type'"
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

**Data Bar Colors**:
- `'#c4d3e9'` - Light blue (professional)
- `'#118DFF'` - Power BI blue
- `'#E66C37'` - Orange/red accent
- Custom hex codes for brand colors

**Customization Points**:
- Replace row hierarchy columns
- Change `"metadata": "Sum(Sales.Sales Amount)"` to match your measure
- Adjust column width value

---

## 4. Hierarchical Slicer

**Use Case**: Date filtering with drill-down capability

**Features**:
- Fiscal Year and Month hierarchy
- "Select All" checkbox enabled
- Expansion states configured
- Pre-selected to FY2019
- Larger text size (16D)

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json",
  "name": "SlicerExample",
  "position": {
    "x": 0,
    "y": 50,
    "z": 3000,
    "height": 250,
    "width": 140
  },
  "visual": {
    "visualType": "slicer",
    "query": {
      "queryState": {
        "Values": {
          "projections": [
            {
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
              },
              "queryRef": "Date.Fiscal.Year",
              "active": true
            },
            {
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
                  "Level": "Month"
                }
              },
              "queryRef": "Date.Fiscal.Month",
              "active": false
            }
          ]
        }
      },
      "sortDefinition": {
        "sort": [
          {
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
            },
            "direction": "Ascending"
          }
        ],
        "isDefaultSort": true
      }
    },
    "expansionStates": [
      {
        "roles": [
          "Values"
        ],
        "levels": [
          {
            "queryRefs": [
              "Date.Fiscal.Year"
            ],
            "isCollapsed": true,
            "identityKeys": [
              {
                "Column": {
                  "Expression": {
                    "SourceRef": {
                      "Entity": "Date"
                    }
                  },
                  "Property": "Fiscal Year"
                }
              }
            ],
            "isPinned": true
          },
          {
            "queryRefs": [
              "Date.Fiscal.Month"
            ],
            "isCollapsed": true,
            "isPinned": true
          }
        ],
        "root": {}
      }
    ],
    "objects": {
      "data": [
        {
          "properties": {
            "mode": {
              "expr": {
                "Literal": {
                  "Value": "'Basic'"
                }
              }
            }
          }
        }
      ],
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
      ],
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
      ],
      "general": [
        {
          "properties": {
            "filter": {
              "filter": {
                "Version": 2,
                "From": [
                  {
                    "Name": "d",
                    "Entity": "Date",
                    "Type": 0
                  }
                ],
                "Where": [
                  {
                    "Condition": {
                      "In": {
                        "Expressions": [
                          {
                            "Column": {
                              "Expression": {
                                "SourceRef": {
                                  "Source": "d"
                                }
                              },
                              "Property": "Fiscal Year"
                            }
                          }
                        ],
                        "Values": [
                          [
                            {
                              "Literal": {
                                "Value": "'FY2019'"
                              }
                            }
                          ]
                        ]
                      }
                    }
                  }
                ]
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

**Slicer Modes**:
- `'Basic'` - Standard list view
- `'Dropdown'` - Dropdown menu
- `'Between'` - Range selection (for dates/numbers)

**Customization Points**:
- Replace hierarchy levels with your dimensions
- Change pre-selected value in "Values" array
- Modify text size

---

## 5. Bar Chart

**Use Case**: Horizontal comparison of categories

**Features**:
- Blue color (#118DFF)
- Axis font sizing
- Active query flags
- Cross-filtering enabled

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json",
  "name": "BarChartExample",
  "position": {
    "x": 0,
    "y": 50,
    "width": 620,
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
      ],
      "valueAxis": [
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
    },
    "visualContainerObjects": {
      "title": [
        {
          "properties": {
            "show": {
              "expr": {
                "Literal": {
                  "Value": "true"
                }
              }
            },
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

## 6. Column Chart

**Use Case**: Vertical comparison over time

**Features**: Similar to bar chart but vertical orientation

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json",
  "name": "ColumnChartExample",
  "position": {
    "x": 0,
    "y": 50,
    "width": 620,
    "height": 300,
    "z": 0
  },
  "visual": {
    "visualType": "columnChart",
    "query": {
      "queryState": {
        "Category": {
          "projections": [
            {
              "field": {
                "Column": {
                  "Expression": {
                    "SourceRef": {
                      "Entity": "Date"
                    }
                  },
                  "Property": "Month"
                }
              },
              "queryRef": "Date.Month",
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
                  "Value": "'Monthly Sales Trend'"
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

## 7. Table Visual

**Use Case**: Detailed row-level data display

**Features**:
- Text size formatting
- Drop shadow
- Multiple columns

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json",
  "name": "TableExample",
  "position": {
    "x": 640,
    "y": 50,
    "width": 630,
    "height": 300,
    "z": 0
  },
  "visual": {
    "visualType": "table",
    "query": {
      "queryState": {
        "Values": {
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
            },
            {
              "field": {
                "Column": {
                  "Expression": {
                    "SourceRef": {
                      "Entity": "Product"
                    }
                  },
                  "Property": "Subcategory"
                }
              },
              "queryRef": "Product.Subcategory",
              "active": true
            },
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
      "grid": [
        {
          "properties": {
            "textSize": {
              "expr": {
                "Literal": {
                  "Value": "12D"
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
                  "Value": "'Product Sales Detail'"
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

## 8. Card Visual

**Use Case**: Display single KPI metric

**Features**:
- Large label font (40D)
- Category label
- Professional formatting

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json",
  "name": "CardExample",
  "position": {
    "x": 0,
    "y": 370,
    "width": 300,
    "height": 150,
    "z": 0
  },
  "visual": {
    "visualType": "card",
    "query": {
      "queryState": {
        "Values": {
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
              "queryRef": "Sum(Sales.Sales Amount)"
            }
          ]
        }
      }
    },
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
            },
            "color": {
              "solid": {
                "color": {
                  "expr": {
                    "Literal": {
                      "Value": "'#252423'"
                    }
                  }
                }
              }
            }
          }
        }
      ],
      "categoryLabels": [
        {
          "properties": {
            "show": {
              "expr": {
                "Literal": {
                  "Value": "true"
                }
              }
            },
            "fontSize": {
              "expr": {
                "Literal": {
                  "Value": "14D"
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
                  "Value": "'Total Sales'"
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
    }
  }
}
```

---

## 9. Donut Chart

**Use Case**: Part-to-whole relationships

**Features**:
- Data labels enabled
- Legend configured
- Professional colors

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json",
  "name": "DonutChartExample",
  "position": {
    "x": 640,
    "y": 370,
    "width": 300,
    "height": 300,
    "z": 0
  },
  "visual": {
    "visualType": "donutChart",
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
              "queryRef": "Sum(Sales.Sales Amount)"
            }
          ]
        }
      }
    },
    "objects": {
      "legend": [
        {
          "properties": {
            "show": {
              "expr": {
                "Literal": {
                  "Value": "true"
                }
              }
            },
            "position": {
              "expr": {
                "Literal": {
                  "Value": "'Right'"
                }
              }
            },
            "fontSize": {
              "expr": {
                "Literal": {
                  "Value": "12D"
                }
              }
            }
          }
        }
      ],
      "labels": [
        {
          "properties": {
            "show": {
              "expr": {
                "Literal": {
                  "Value": "true"
                }
              }
            },
            "labelStyle": {
              "expr": {
                "Literal": {
                  "Value": "'Category, percentage of total'"
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
                  "Value": "'Sales Distribution by Category'"
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

## 10. Line Chart

**Use Case**: Trend analysis over continuous time

**Features**:
- Markers enabled
- Trend line support
- Axis configuration

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json",
  "name": "LineChartExample",
  "position": {
    "x": 0,
    "y": 370,
    "width": 620,
    "height": 300,
    "z": 0
  },
  "visual": {
    "visualType": "lineChart",
    "query": {
      "queryState": {
        "Category": {
          "projections": [
            {
              "field": {
                "Column": {
                  "Expression": {
                    "SourceRef": {
                      "Entity": "Date"
                    }
                  },
                  "Property": "Month"
                }
              },
              "queryRef": "Date.Month",
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
            "showAllDataPoints": {
              "expr": {
                "Literal": {
                  "Value": "true"
                }
              }
            }
          }
        }
      ],
      "markers": [
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
      ],
      "valueAxis": [
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
    },
    "visualContainerObjects": {
      "title": [
        {
          "properties": {
            "text": {
              "expr": {
                "Literal": {
                  "Value": "'Sales Trend Over Time'"
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

## Usage Instructions

### How to Use These Templates

1. **Copy the entire JSON** for the visual type you need
2. **Replace placeholder values**:
   - Entity names (e.g., `"Sales"`, `"Product"`, `"Date"`)
   - Property/column names (e.g., `"Sales Amount"`, `"Category"`)
   - Measure names (e.g., `"Sum(Sales.Sales Amount)"`)
   - Position coordinates (x, y, width, height)
   - Titles and labels
3. **Save as `visual.json`** in the appropriate folder:
   ```
   yourReport.Report/definition/pages/YourPageName/visuals/VisualContainerName/visual.json
   ```
4. **Open in Power BI Desktop** to see the styled visual

### Quick Find & Replace Guide

For each template, search and replace:
- `"Entity": "Sales"` → Your fact table name
- `"Entity": "Product"` → Your dimension table name
- `"Entity": "Date"` → Your date table name
- `"Property": "Sales Amount"` → Your measure column
- Adjust position values for your layout
- Customize colors in hex format (#RRGGBB)

---

## Common Modifications

### Change Colors
Replace color values:
```json
"color": {
  "expr": {
    "Literal": {
      "Value": "'#118DFF'"  // Replace with your brand color
    }
  }
}
```

### Adjust Fonts
Change font sizes (values end with D):
```json
"fontSize": {
  "expr": {
    "Literal": {
      "Value": "16D"  // 10D-20D typical range
    }
  }
}
```

### Disable Drop Shadow
Set show to false:
```json
"dropShadow": [
  {
    "properties": {
      "show": {
        "expr": {
          "Literal": {
            "Value": "false"
          }
        }
      }
    }
  }
]
```

---

**Last Updated**: 2026-01-29
**Source**: Adventure Works Sales Sample Report
**Companion Guide**: VISUAL_STYLING_GUIDE.md
