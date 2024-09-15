import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  EntityInputType,
  EntityUploadCurrentSchema,
  EntityUploadV1Schema,
} from "@/lib/validations/entities";
import { CloudUpload as SaveIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { EntityTypeEnum } from "@/lib/types";
import { useMutation } from "@tanstack/react-query";
import { createEntity, getEntityByText } from "../actions";
import { Prisma } from "@prisma/client";
import { toast } from "sonner";
interface EntityBulkCreatorProps {
  parentId?: string;
  parentType?: EntityTypeEnum;
}
const EntityBulkCreator = ({
  parentId,
  parentType,
}: EntityBulkCreatorProps) => {
  const defaultUploadText =
    parentId && parentType
      ? {
          ...DEFAULT_ENTITY_UPLOAD_TEXT,
          entity: {
            ...DEFAULT_ENTITY_UPLOAD_TEXT.entity,
            parentIDs: [
              ...(DEFAULT_ENTITY_UPLOAD_TEXT.entity.parentIDs ?? []),
              {
                id: parentId,
                type: parentType,
              },
            ],
          },
        }
      : DEFAULT_ENTITY_UPLOAD_TEXT;

  const [text, setText] = useState<string>(
    JSON.stringify(defaultUploadText, null, 2),
  );
  const { mutateAsync: getEntityByTextFn, isPending: fetchEntityLoading } =
    useMutation({
      mutationKey: ["getEntityByText", text],
      mutationFn: async ({
        text,
        types,
      }: {
        text: string;
        types: string[];
      }) => {
        const res = await getEntityByText(text, types);
        return res;
      },
    });
  const {
    mutateAsync: createEntityFn,
    isPending: createLoading,
    error: createEntityError,
  } = useMutation({
    mutationKey: ["createEntity", text],
    mutationFn: async ({ data }: { data: EntityInputType }) => {
      const entity: Prisma.EntityCreateInput = {
        type: data.type,
        text: data.text,
        parents: data.parentIDs?.map((e) => ({
          entity: e.id,
          type: e.type,
        })),
        attributes: data.attributes,
        audio: data.audio,
        imageThumbnail: data.imageThumbnail,
        bookmarked: data.bookmarked,
        meaning: data.meaning,
        order: data.order,
        notes: data.notes,
      };
      const children = data.children?.map((data, idx) => ({
        type: data.type,
        text: data.text,
        attributes: data.attributes,
        audio: data.audio,
        imageThumbnail: data.imageThumbnail,
        bookmarked: data.bookmarked,
        meaning: data.meaning,
        order: data.order || idx,
        notes: data.notes,
      }));
      const res = await createEntity({ entity, children });
      return res;
    },
  });

  const createEntityAction = async () => {
    const res = convertJsonToEntity(text);
    if (res.errors) {
      console.log(res.errors);
      toast.error("Entity conversion failed");
      // toast({
      //   title: "Entity conversion failed",
      //   description: res.errors.join(", "),
      //   variant: "destructive",
      // });
    } else {
      if (res.entity?.parentIDs?.length === 0 && res.entity?.parents) {
        const parents: EntityInputType[] = res.entity.parents;

        const resParent = await getEntityByTextFn({
          text: parents[0].text[0].value,
          types: [parents[0].type],
        });

        if (resParent !== null && res.entity) {
          res.entity.parents?.pop();
          res.entity.parents = undefined;
          res.entity.parentIDs = [
            {
              id: resParent.id,
              type: resParent.type,
            },
          ];
        }
      }
      const data: EntityInputType = {
        ...res.entity,
        type: res.entity?.type || "STHOTRAM",
        text: res.entity?.text || [],
        parentIDs: res.entity?.parentIDs?.map((e) => ({
          id: e.id,
          type: e.type,
        })),
      };
      const resEntity = await createEntityFn({ data });
      if (resEntity) {
        toast.success("Entity created successfully");
        // toast({
        //   title: "Entity created",
        //   description: "Entity created successfully",
        //   duration: 1000,
        // });
      }
      if (createEntityError) {
        toast.error("Entity creation failed");
        // toast({
        //   title: "Entity creation failed",
        //   description: createEntityError.message,
        //   variant: "destructive",
        // });
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-row justify-between items-center">
        <h2>Entity Creator</h2>
        <div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={createLoading || fetchEntityLoading}
            onClick={createEntityAction}
          >
            <SaveIcon size={24} />
          </Button>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <Textarea
          className="h-full resize-none"
          value={text}
          onChange={(e) => {
            const value = e.target.value;
            setText(value);
          }}
        />
      </div>
    </div>
  );
};

export default EntityBulkCreator;

const convertJsonToEntity = (text: string) => {
  const res: {
    entity?: Partial<EntityInputType>;
    errors?: Array<Record<string, string>>;
  } = {
    entity: undefined,
    errors: undefined,
  };

  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.log(e);
    res.errors = [
      {
        message: "invalid JSON",
      },
    ];
    return res;
  }

  if (json.version === undefined || json.version === "1") {
    return convertV1JsonToEntity(json as never);
  } else if (json.version === "current") {
    return validateEntityCurrentJSON(json as never);
  }

  res.errors = [
    {
      message: "invalid/missing version",
    },
  ];

  return res;
};

const convertV1JsonToEntity = (json: never) => {
  const res: {
    entity?: Partial<EntityInputType>;
    errors?: Array<Record<string, string>>;
  } = {
    entity: undefined,
    errors: undefined,
  };
  const resValidation = validateEntityV1JSON(json);

  if (resValidation.errors) {
    res.errors = resValidation.errors;
    return res;
  }

  const entityV1 = resValidation.entity!;

  const entity: Partial<EntityInputType> = {
    type: entityV1.entity.type,
    text: [
      {
        language: "ENG",
        value: entityV1.entity.text,
      },
    ],
    parentIDs: [],
    parents: [],
    children: [],
    attributes: [
      {
        key: "source",
        value: entityV1.contents.TEL?.source || "",
      },
    ],
  };
  if (entityV1.parent?.id) {
    entity.parentIDs?.push({
      type: entityV1.parent.type,
      id: entityV1.parent.id,
    });
  } else if (entityV1.parent?.text) {
    entity.parents?.push({
      type: entityV1.parent.type,
      text: [
        {
          language: "ENG",
          value: entityV1.parent.text,
        },
      ],
    });
  }

  if (entityV1.entity.textData.TEL) {
    entity.text?.push({
      language: "TEL",
      value: entityV1.entity.textData.TEL.text,
    });
  }
  if (entityV1.entity.textData.SAN) {
    entity.text?.push({
      language: "SAN",
      value: entityV1.entity.textData.SAN.text,
    });
  }
  if (entityV1.entity.textData.IAST) {
    entity.text?.push({
      language: "IAST",
      value: entityV1.entity.textData.IAST.text,
    });
  }

  entityV1.contents.SAN?.contents.forEach((content) => {
    if (!content) {
      entity.children!.push({
        type: entityV1.contents.type,
        text: [],
      });
    } else {
      entity.children!.push({
        type: entityV1.contents.type,
        text: [
          {
            language: "SAN",
            value: content,
          },
        ],
      });
    }
  });

  entityV1.contents.TEL?.contents.forEach((content, i) => {
    if (!entity.children![i]) {
      entity.children!.push({
        type: entityV1.contents.type,
        text: [],
      });
    }
    if (content) {
      entity.children![i].text.push({
        language: "TEL",
        value: content,
      });
    }
  });

  entityV1.contents.IAST?.contents.forEach((content, i) => {
    if (!entity.children![i]) {
      entity.children!.push({
        type: entityV1.contents.type,
        text: [],
      });
    }
    if (content) {
      entity.children![i].text.push({
        language: "IAST",
        value: content,
      });
    }
  });

  return { ...res, entity };
};

const validateEntityV1JSON = (json: never) => {
  const res: {
    entity?: z.infer<typeof EntityUploadV1Schema>;
    errors?: Array<Record<string, string>>;
  } = {
    errors: undefined,
    entity: undefined,
  };

  try {
    res.entity = EntityUploadV1Schema.parse(json);
  } catch (e) {
    console.error(e);
    res.errors = [
      {
        message: "invalid json",
      },
    ];
  }

  return res;
};

const validateEntityCurrentJSON = (json: never) => {
  const res: {
    entity?: EntityInputType;
    errors?: Array<Record<string, string>>;
  } = {
    errors: undefined,
    entity: undefined,
  };

  try {
    const currSchema = EntityUploadCurrentSchema.parse(json);
    res.entity = currSchema.entity;
  } catch (e) {
    console.error(e);
    res.errors = [
      {
        message: "invalid json",
      },
    ];
  }

  return res;
};

const DEFAULT_ENTITY_UPLOAD_TEXT: z.infer<typeof EntityUploadCurrentSchema> = {
  version: "current",
  entity: {
    parentIDs: [],
    type: "STHOTRAM",
    imageThumbnail: "/default-om_256.png",
    text: [
      {
        language: "ENG",
        value: "",
      },
      {
        language: "TEL",
        value: "",
      },
      {
        language: "SAN",
        value: "$transliterateFrom=TEL",
      },
      {
        language: "IAST",
        value: "$transliterateFrom=TEL",
      },
      {
        language: "SLP1",
        value: "$transliterateFrom=TEL",
      },
    ],
    children: [
      {
        type: "SLOKAM",
        text: [
          {
            language: "ENG",
            value: "",
          },
          {
            language: "TEL",
            value: "",
          },
          {
            language: "SAN",
            value: "$transliterateFrom=TEL",
          },
          {
            language: "IAST",
            value: "$transliterateFrom=TEL",
          },
          {
            language: "SLP1",
            value: "$transliterateFrom=TEL",
          },
        ],
        meaning: [
          {
            language: "ENG",
            value: "",
          },
          {
            language: "TEL",
            value: "",
          },
          {
            language: "SAN",
            value: "$transliterateFrom=TEL",
          },

          {
            language: "IAST",
            value: "$transliterateFrom=TEL",
          },
          {
            language: "SLP1",
            value: "$transliterateFrom=TEL",
          },
        ],
      },
    ],
    attributes: [
      {
        key: "source",
        value: "",
      },
    ],
  },
};
