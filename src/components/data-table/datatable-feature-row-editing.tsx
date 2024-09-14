import {
  OnChangeFn,
  Table,
  Row,
  RowModel,
  Updater,
  RowData,
  TableFeature,
} from "@tanstack/react-table";
import { getMemoOptions, makeStateUpdater, memo } from "@tanstack/react-table";

export type RowEditState = Record<string, boolean>;

export interface RowEditTableState {
  rowEdit: RowEditState;
}

export interface RowEditOptions<TData extends RowData> {
  /**
   * - Enables/disables multiple row edit for all rows in the table OR
   * - A function that given a row, returns whether to enable/disable multiple row edit for that row's children/grandchildren
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#enablemultirowedit)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  enableMultiRowEdit?: boolean | ((row: Row<TData>) => boolean);
  /**
   * - Enables/disables row edit for all rows in the table OR
   * - A function that given a row, returns whether to enable/disable row edit for that row
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#enablerowedit)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  enableRowEdit?: boolean | ((row: Row<TData>) => boolean);
  /**
   * Enables/disables automatic sub-row edit when a parent row is editing, or a function that enables/disables automatic sub-row edit for each row.
   * (Use in combination with expanding or grouping features)
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#enablesubrowedit)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  enableSubRowEdit?: boolean | ((row: Row<TData>) => boolean);
  /**
   * If provided, this function will be called with an `updaterFn` when `state.rowEdit` changes. This overrides the default internal state management, so you will need to persist the state change either fully or partially outside of the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#onroweditchange)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  onRowEditChange?: OnChangeFn<RowEditState>;
  // enableGroupingRowEdit?:
  //   | boolean
  //   | ((
  //       row: Row<TData>
  //     ) => boolean)
  // isAdditiveEditEvent?: (e: unknown) => boolean
  // isInclusiveEditEvent?: (e: unknown) => boolean
  // editRowsFn?: (
  //   table: Table<TData>,
  //   rowModel: RowModel<TData>
  // ) => RowModel<TData>
}

export interface RowEditRow {
  /**
   * Returns whether or not the row can multi-edit.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getcanmultiedit)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getCanMultiEdit: () => boolean;
  /**
   * Returns whether or not the row can be editing.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getcanedit)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getCanEdit: () => boolean;
  /**
   * Returns whether or not the row can edit sub rows automatically when the parent row is editing.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getcaneditsubrows)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getCanEditSubRows: () => boolean;
  /**
   * Returns whether or not all of the row's sub rows are editing.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getisallsubrowsediting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getIsAllSubRowsEditing: () => boolean;
  /**
   * Returns whether or not the row is editing.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getisediting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getIsEditing: () => boolean;
  /**
   * Returns whether or not some of the row's sub rows are editing.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getissomeediting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getIsSomeEditing: () => boolean;
  /**
   * Returns a handler that can be used to toggle the row.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#gettoggleeditinghandler)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getToggleEditingHandler: () => (event: unknown) => void;
  /**
   * Edits/deedits the row.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#toggleediting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  toggleEditing: (value?: boolean, opts?: { editChildren?: boolean }) => void;
}

export interface RowEditInstance<TData extends RowData> {
  /**
   * Returns the row model of all rows that are editing after filtering has been applied.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getfilterededitingrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getFilteredEditingRowModel: () => RowModel<TData>;
  /**
   * Returns the row model of all rows that are editing after grouping has been applied.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getgroupededitingrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getGroupedEditingRowModel: () => RowModel<TData>;
  /**
   * Returns whether or not all rows on the current page are editing.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getisallpagerowsediting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getIsAllPageRowsEditing: () => boolean;
  /**
   * Returns whether or not all rows in the table are editing.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getisallrowsediting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getIsAllRowsEditing: () => boolean;
  /**
   * Returns whether or not any rows on the current page are editing.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getissomepagerowsediting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getIsSomePageRowsEditing: () => boolean;
  /**
   * Returns whether or not any rows in the table are editing.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getissomerowsediting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getIsSomeRowsEditing: () => boolean;
  /**
   * Returns the core row model of all rows before row edit has been applied.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#getpreeditingrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getPreEditingRowModel: () => RowModel<TData>;
  /**
   * Returns the row model of all rows that are editing.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#geteditingrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getEditingRowModel: () => RowModel<TData>;
  /**
   * Returns a handler that can be used to toggle all rows on the current page.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#gettoggleallpagerowseditinghandler)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getToggleAllPageRowsEditingHandler: () => (event: unknown) => void;
  /**
   * Returns a handler that can be used to toggle all rows in the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#gettoggleallrowseditinghandler)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  getToggleAllRowsEditingHandler: () => (event: unknown) => void;
  /**
   * Resets the **rowEdit** state to the `initialState.rowEdit`, or `true` can be passed to force a default blank state reset to `{}`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#resetrowedit)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  resetRowEdit: (defaultState?: boolean) => void;
  /**
   * Sets or updates the `state.rowEdit` state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#setrowedit)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  setRowEdit: (updater: Updater<RowEditState>) => void;
  /**
   * Edits/deedits all rows on the current page.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#toggleallpagerowsediting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  toggleAllPageRowsEditing: (value?: boolean) => void;
  /**
   * Edits/deedits all rows in the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-edit#toggleallrowsediting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-edit)
   */
  toggleAllRowsEditing: (value?: boolean) => void;
}

//

export const RowEditFeature: TableFeature = {
  getInitialState: (state): RowEditTableState => {
    return {
      rowEdit: {},
      ...state,
    };
  },

  getDefaultOptions: <TData extends RowData>(
    table: Table<TData>,
  ): RowEditOptions<TData> => {
    return {
      onRowEditChange: makeStateUpdater("rowEdit", table),
      enableRowEdit: true,
      enableMultiRowEdit: true,
      enableSubRowEdit: true,
      // enableGroupingRowEdit: false,
      // isAdditiveEditEvent: (e: unknown) => !!e.metaKey,
      // isInclusiveEditEvent: (e: unknown) => !!e.shiftKey,
    };
  },

  createTable: <TData extends RowData>(table: Table<TData>): void => {
    table.setRowEdit = (updater) => table.options.onRowEditChange?.(updater);
    table.resetRowEdit = (defaultState) =>
      table.setRowEdit(defaultState ? {} : (table.initialState.rowEdit ?? {}));
    table.toggleAllRowsEditing = (value) => {
      table.setRowEdit((old) => {
        value =
          typeof value !== "undefined" ? value : !table.getIsAllRowsEditing();

        const rowEdit = { ...old };

        const preGroupedFlatRows = table.getPreGroupedRowModel().flatRows;

        // We don't use `mutateRowIsEditing` here for performance reasons.
        // All of the rows are flat already, so it wouldn't be worth it
        if (value) {
          preGroupedFlatRows.forEach((row) => {
            if (!row.getCanEdit()) {
              return;
            }
            rowEdit[row.id] = true;
          });
        } else {
          preGroupedFlatRows.forEach((row) => {
            delete rowEdit[row.id];
          });
        }

        return rowEdit;
      });
    };
    table.toggleAllPageRowsEditing = (value) =>
      table.setRowEdit((old) => {
        const resolvedValue =
          typeof value !== "undefined"
            ? value
            : !table.getIsAllPageRowsEditing();

        const rowEdit: RowEditState = { ...old };

        table.getRowModel().rows.forEach((row) => {
          mutateRowIsEditing(rowEdit, row.id, resolvedValue, true, table);
        });

        return rowEdit;
      });

    // addRowEditRange: rowId => {
    //   const {
    //     rows,
    //     rowsById,
    //     options: { editGroupingRows, editSubRows },
    //   } = table

    //   const findEditingRow = (rows: Row[]) => {
    //     let found
    //     rows.find(d => {
    //       if (d.getIsEditing()) {
    //         found = d
    //         return true
    //       }
    //       const subFound = findEditingRow(d.subRows || [])
    //       if (subFound) {
    //         found = subFound
    //         return true
    //       }
    //       return false
    //     })
    //     return found
    //   }

    //   const firstRow = findEditingRow(rows) || rows[0]
    //   const lastRow = rowsById[rowId]

    //   let include = false
    //   const editingRowIds = {}

    //   const addRow = (row: Row) => {
    //     mutateRowIsEditing(editingRowIds, row.id, true, {
    //       rowsById,
    //       editGroupingRows: editGroupingRows!,
    //       editSubRows: editSubRows!,
    //     })
    //   }

    //   table.rows.forEach(row => {
    //     const isFirstRow = row.id === firstRow.id
    //     const isLastRow = row.id === lastRow.id

    //     if (isFirstRow || isLastRow) {
    //       if (!include) {
    //         include = true
    //       } else if (include) {
    //         addRow(row)
    //         include = false
    //       }
    //     }

    //     if (include) {
    //       addRow(row)
    //     }
    //   })

    //   table.setRowEdit(editingRowIds)
    // },
    table.getPreEditingRowModel = () => table.getCoreRowModel();
    table.getEditingRowModel = memo(
      () => [table.getState().rowEdit, table.getCoreRowModel()],
      (rowEdit, rowModel) => {
        if (!Object.keys(rowEdit).length) {
          return {
            rows: [],
            flatRows: [],
            rowsById: {},
          };
        }

        return editRowsFn(table, rowModel);
      },
      getMemoOptions(table.options, "debugTable", "getEditingRowModel"),
    );

    table.getFilteredEditingRowModel = memo(
      () => [table.getState().rowEdit, table.getFilteredRowModel()],
      (rowEdit, rowModel) => {
        if (!Object.keys(rowEdit).length) {
          return {
            rows: [],
            flatRows: [],
            rowsById: {},
          };
        }

        return editRowsFn(table, rowModel);
      },
      getMemoOptions(table.options, "debugTable", "getFilteredEditingRowModel"),
    );

    table.getGroupedEditingRowModel = memo(
      () => [table.getState().rowEdit, table.getSortedRowModel()],
      (rowEdit, rowModel) => {
        if (!Object.keys(rowEdit).length) {
          return {
            rows: [],
            flatRows: [],
            rowsById: {},
          };
        }

        return editRowsFn(table, rowModel);
      },
      getMemoOptions(table.options, "debugTable", "getGroupedEditingRowModel"),
    );

    ///

    // getGroupingRowCanEdit: rowId => {
    //   const row = table.getRow(rowId)

    //   if (!row) {
    //     throw new Error()
    //   }

    //   if (typeof table.options.enableGroupingRowEdit === 'function') {
    //     return table.options.enableGroupingRowEdit(row)
    //   }

    //   return table.options.enableGroupingRowEdit ?? false
    // },

    table.getIsAllRowsEditing = () => {
      const preGroupedFlatRows = table.getFilteredRowModel().flatRows;
      const { rowEdit } = table.getState();

      let isAllRowsEditing = Boolean(
        preGroupedFlatRows.length && Object.keys(rowEdit).length,
      );

      if (isAllRowsEditing) {
        if (
          preGroupedFlatRows.some((row) => row.getCanEdit() && !rowEdit[row.id])
        ) {
          isAllRowsEditing = false;
        }
      }

      return isAllRowsEditing;
    };

    table.getIsAllPageRowsEditing = () => {
      const paginationFlatRows = table
        .getPaginationRowModel()
        .flatRows.filter((row) => row.getCanEdit());
      const { rowEdit } = table.getState();

      let isAllPageRowsEditing = !!paginationFlatRows.length;

      if (
        isAllPageRowsEditing &&
        paginationFlatRows.some((row) => !rowEdit[row.id])
      ) {
        isAllPageRowsEditing = false;
      }

      return isAllPageRowsEditing;
    };

    table.getIsSomeRowsEditing = () => {
      const totalEditing = Object.keys(table.getState().rowEdit ?? {}).length;
      return (
        totalEditing > 0 &&
        totalEditing < table.getFilteredRowModel().flatRows.length
      );
    };

    table.getIsSomePageRowsEditing = () => {
      const paginationFlatRows = table.getPaginationRowModel().flatRows;
      return table.getIsAllPageRowsEditing()
        ? false
        : paginationFlatRows
            .filter((row) => row.getCanEdit())
            .some((d) => d.getIsEditing() || d.getIsSomeEditing());
    };

    table.getToggleAllRowsEditingHandler = () => {
      return (e: unknown) => {
        table.toggleAllRowsEditing(
          ((e as MouseEvent).target as HTMLInputElement).checked,
        );
      };
    };

    table.getToggleAllPageRowsEditingHandler = () => {
      return (e: unknown) => {
        table.toggleAllPageRowsEditing(
          ((e as MouseEvent).target as HTMLInputElement).checked,
        );
      };
    };
  },

  createRow: <TData extends RowData>(
    row: Row<TData>,
    table: Table<TData>,
  ): void => {
    row.toggleEditing = (value, opts) => {
      const isEditing = row.getIsEditing();

      table.setRowEdit((old) => {
        value = typeof value !== "undefined" ? value : !isEditing;

        if (row.getCanEdit() && isEditing === value) {
          return old;
        }

        const editingRowIds = { ...old };

        mutateRowIsEditing(
          editingRowIds,
          row.id,
          value,
          opts?.editChildren ?? true,
          table,
        );

        return editingRowIds;
      });
    };
    row.getIsEditing = () => {
      const { rowEdit } = table.getState();
      return isRowEditing(row, rowEdit);
    };

    row.getIsSomeEditing = () => {
      const { rowEdit } = table.getState();
      return isSubRowEditing(row, rowEdit, table) === "some";
    };

    row.getIsAllSubRowsEditing = () => {
      const { rowEdit } = table.getState();
      return isSubRowEditing(row, rowEdit, table) === "all";
    };

    row.getCanEdit = () => {
      if (typeof table.options.enableRowEdit === "function") {
        return table.options.enableRowEdit(row);
      }

      return table.options.enableRowEdit ?? true;
    };

    row.getCanEditSubRows = () => {
      if (typeof table.options.enableSubRowEdit === "function") {
        return table.options.enableSubRowEdit(row);
      }

      return table.options.enableSubRowEdit ?? true;
    };

    row.getCanMultiEdit = () => {
      if (typeof table.options.enableMultiRowEdit === "function") {
        return table.options.enableMultiRowEdit(row);
      }

      return table.options.enableMultiRowEdit ?? true;
    };
    row.getToggleEditingHandler = () => {
      const canEdit = row.getCanEdit();

      return (e: unknown) => {
        if (!canEdit) return;
        row.toggleEditing(
          ((e as MouseEvent).target as HTMLInputElement)?.checked,
        );
      };
    };
  },
};

const mutateRowIsEditing = <TData extends RowData>(
  editingRowIds: Record<string, boolean>,
  id: string,
  value: boolean,
  includeChildren: boolean,
  table: Table<TData>,
) => {
  const row = table.getRow(id, true);

  // const isGrouped = row.getIsGrouped()

  // if ( // TODO: enforce grouping row edit rules
  //   !isGrouped ||
  //   (isGrouped && table.options.enableGroupingRowEdit)
  // ) {
  if (value) {
    if (!row.getCanMultiEdit()) {
      Object.keys(editingRowIds).forEach((key) => delete editingRowIds[key]);
    }
    if (row.getCanEdit()) {
      editingRowIds[id] = true;
    }
  } else {
    delete editingRowIds[id];
  }
  // }

  if (includeChildren && row.subRows?.length && row.getCanEditSubRows()) {
    row.subRows.forEach((row) =>
      mutateRowIsEditing(editingRowIds, row.id, value, includeChildren, table),
    );
  }
};

export function editRowsFn<TData extends RowData>(
  table: Table<TData>,
  rowModel: RowModel<TData>,
): RowModel<TData> {
  const rowEdit = table.getState().rowEdit;

  const newEditingFlatRows: Row<TData>[] = [];
  const newEditingRowsById: Record<string, Row<TData>> = {};

  // Filters top level and nested rows
  const recurseRows = (rows: Row<TData>[], depth = 0): Row<TData>[] => {
    return rows
      .map((row) => {
        const isEditing = isRowEditing(row, rowEdit);

        if (isEditing) {
          newEditingFlatRows.push(row);
          newEditingRowsById[row.id] = row;
        }

        if (row.subRows?.length) {
          row = {
            ...row,
            subRows: recurseRows(row.subRows, depth + 1),
          };
        }

        if (isEditing) {
          return row;
        }
      })
      .filter(Boolean) as Row<TData>[];
  };

  return {
    rows: recurseRows(rowModel.rows),
    flatRows: newEditingFlatRows,
    rowsById: newEditingRowsById,
  };
}

export function isRowEditing<TData extends RowData>(
  row: Row<TData>,
  editing: Record<string, boolean>,
): boolean {
  return editing[row.id] ?? false;
}

export function isSubRowEditing<TData extends RowData>(
  row: Row<TData>,
  editing: Record<string, boolean>,
  table: Table<TData>,
): boolean | "some" | "all" {
  if (!row.subRows?.length) return false;

  let allChildrenEditing = true;
  let someEditing = false;

  row.subRows.forEach((subRow) => {
    // Bail out early if we know both of these
    if (someEditing && !allChildrenEditing) {
      return;
    }

    if (subRow.getCanEdit()) {
      if (isRowEditing(subRow, editing)) {
        someEditing = true;
      } else {
        allChildrenEditing = false;
      }
    }

    // Check row edit of nested subrows
    if (subRow.subRows && subRow.subRows.length) {
      const subRowChildrenEditing = isSubRowEditing(subRow, editing, table);
      if (subRowChildrenEditing === "all") {
        someEditing = true;
      } else if (subRowChildrenEditing === "some") {
        someEditing = true;
        allChildrenEditing = false;
      } else {
        allChildrenEditing = false;
      }
    }
  });

  return allChildrenEditing ? "all" : someEditing ? "some" : false;
}
