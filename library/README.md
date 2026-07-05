# Library

Modular functions for ARC puzzles.


### Task 00dbd492
- **cloneGrid**: Creates a deep copy of a 2D number array to prevent unintended mutations of the source grid.
- **findComponents**: Identifies distinct connected components of the value 2 in a grid using a Breadth-First Search (BFS) algorithm.
- **fillComponentInterior**: Calculates the bounding box of a component and fills the empty (0) interior space with a color determined by the component's internal dimensions.

### Task 03560426
- **findComponents**: Performs a Breadth-First Search (BFS) on the grid to identify and isolate contiguous regions (components) of pixels sharing the same non-zero color. Returns a list of components, where each component contains the lists of row indices, column indices, and the uniform color value.
- **writeComponent**: Transfers a component's pixels to a target grid starting at a specific offset. It calculates the component's bounding box and maps the pixels relative to the top-leftmost coordinate of that component to the new location (offsetR, offsetC).
- **getComponentDimensions**: Computes the height and width of the bounding box enclosing a specific component.
