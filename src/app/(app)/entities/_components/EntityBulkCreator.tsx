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
import { LANGUAGES } from "@/lib/constants";
interface EntityBulkCreatorProps {
  parentId?: string;
  parentType?: EntityTypeEnum;
  entityType?: EntityTypeEnum;
}
const EntityBulkCreator = ( {
  parentId,
  parentType,
  entityType,
}: EntityBulkCreatorProps ) => {
  const defaultUploadText =
    parentId || parentType || entityType
      ? {
        ...DEFAULT_ENTITY_UPLOAD_TEXT,
        entities: [
          ...DEFAULT_ENTITY_UPLOAD_TEXT.entities.map( ( e ) => ( {
            ...e,
            type: entityType ?? e.type,
            parentIDs:
              parentId && parentType
                ? [
                  ...( e.parentIDs ?? [] ),
                  {
                    id: parentId,
                    type: parentType,
                  },
                ]
                : [],
          } ) ),
        ],
      }
      : DEFAULT_ENTITY_UPLOAD_TEXT;

  const [ text, setText ] = useState<string>(
    JSON.stringify( defaultUploadText, null, 2 ),
  );
  const { mutateAsync: getEntityByTextFn, isPending: fetchEntityLoading } =
    useMutation( {
      mutationKey: [ "getEntityByText", text ],
      mutationFn: async ( {
        text,
        types,
      }: {
        text: string;
        types: string[];
      } ) => {
        const res = await getEntityByText( text, types );
        return res;
      },
    } );
  const {
    mutateAsync: createEntityFn,
    isPending: createLoading,
    error: createEntityError,
  } = useMutation( {
    mutationKey: [ "createEntity", text ],
    mutationFn: async ( { data }: { data: EntityInputType } ) => {
      const entity: Prisma.EntityCreateInput = {
        type: data.type,
        text: data.text,
        parentsRel: {
          connect: data.parentIDs?.map( ( e ) => ( {
            id: e.id,
          } ) ),
        },
        attributes: data.attributes,
        audio: data.audio,
        imageThumbnail: data.imageThumbnail || "/default-om_256.png",
        bookmarked: data.bookmarked,
        meaning: data.meaning,
        order: data.order,
        notes: data.notes,
      };
      const children = data.children?.map( ( data, idx ) => ( {
        type: data.type,
        text: data.text,
        attributes: data.attributes,
        audio: data.audio,
        imageThumbnail: data.imageThumbnail,
        bookmarked: data.bookmarked,
        meaning: data.meaning,
        order: data.order || idx,
        notes: data.notes,
      } ) );
      const res = await createEntity( { entity, children } );
      return res;
    },
  } );

  const createEntityAction = async () => {
    const resEntities = convertJsonToEntity( text );
    if ( resEntities.errors ) {
      console.log( resEntities.errors );
      toast.error( "Entity conversion failed" );
      // toast({
      //   title: "Entity conversion failed",
      //   description: resEntities.errors.join(", "),
      //   variant: "destructive",
      // });
    } else {
      if ( resEntities.entities === undefined ) {
        toast.error( "No entities found" );
        return;
      }
      for ( const res of resEntities.entities ) {
        if ( res?.parentIDs?.length === 0 && res?.parents ) {
          const parents: EntityInputType[] = res.parents;

          const resParent = await getEntityByTextFn( {
            text: parents[ 0 ].text[ 0 ].value,
            types: [ parents[ 0 ].type ],
          } );

          if ( resParent !== null && res ) {
            res.parents?.pop();
            res.parents = undefined;
            res.parentIDs = [
              {
                id: resParent.id,
                type: resParent.type,
              },
            ];
          }
        }
        const data: EntityInputType = {
          ...res,
          type: res?.type || "STHOTRAM",
          text: res?.text || [],
          parentIDs: res?.parentIDs?.map( ( e ) => ( {
            id: e.id,
            type: e.type,
          } ) ),
        };
        const resEntity = await createEntityFn( { data } );
        if ( resEntity ) {
          toast.success( "Entity created successfully" );
          // toast({
          //   title: "Entity created",
          //   description: "Entity created successfully",
          //   duration: 1000,
          // });
        }
        if ( createEntityError ) {
          toast.error( "Entity creation failed" );
          // toast({
          //   title: "Entity creation failed",
          //   description: createEntityError.message,
          //   variant: "destructive",
          // });
        }
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
          onChange={( e ) => {
            const value = e.target.value;
            setText( value );
          }}
        />
      </div>
    </div>
  );
};

export default EntityBulkCreator;

const convertJsonToEntity = ( text: string ) => {
  const res: {
    entities?: Partial<EntityInputType>[];
    errors?: Array<Record<string, string>>;
  } = {
    entities: undefined,
    errors: undefined,
  };

  let json: any;
  try {
    json = JSON.parse( text );
  } catch ( e ) {
    console.log( e );
    res.errors = [
      {
        message: "invalid JSON",
      },
    ];
    return res;
  }

  if ( json.version === undefined || json.version === "1" ) {
    return convertV1JsonToEntity( json as never );
  } else if ( json.version === "current" ) {
    return validateEntityCurrentJSON( json as never );
  }

  res.errors = [
    {
      message: "invalid/missing version",
    },
  ];

  return res;
};

const convertV1JsonToEntity = ( json: never ) => {
  const res: {
    entities?: Partial<EntityInputType>[];
    errors?: Array<Record<string, string>>;
  } = {
    entities: undefined,
    errors: undefined,
  };
  const resValidation = validateEntityV1JSON( json );

  if ( resValidation.errors ) {
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
  if ( entityV1.parent?.id ) {
    entity.parentIDs?.push( {
      type: entityV1.parent.type,
      id: entityV1.parent.id,
    } );
  } else if ( entityV1.parent?.text ) {
    entity.parents?.push( {
      type: entityV1.parent.type,
      text: [
        {
          language: "ENG",
          value: entityV1.parent.text,
        },
      ],
    } );
  }

  LANGUAGES.forEach( ( lang ) => {
    const textData =
      entityV1.entity.textData[ lang as keyof typeof entityV1.entity.textData ];
    if ( textData ) {
      entity.text?.push( {
        language: lang,
        value: textData.text,
      } );
    }
  } );

  LANGUAGES.forEach( ( lang ) => {
    const contents =
      entityV1.contents[ lang as keyof Omit<typeof entityV1.contents, "type"> ];
    if ( contents?.contents ) {
      const contentMeanings = contents.meanings || [];
      contents.contents.forEach( ( content, idx ) => {
        const entityChildAtIdx = entity.children![ idx ];
        const meaningAtIdx = contentMeanings[ idx ];
        if ( !entityChildAtIdx ) {
          entity.children!.push( {
            type: entityV1.contents.type,
            text: [
              {
                language: lang as any,
                value: content,
              },
            ],
            meaning: meaningAtIdx
              ? [
                {
                  language: lang as any,
                  value: meaningAtIdx,
                },
              ]
              : [],
          } );
        } else {
          entity.children![ idx ].text.push( {
            language: lang as any,
            value: content,
          } );
          if ( meaningAtIdx ) {
            entity.children![ idx ].meaning?.push( {
              language: lang as any,
              value: meaningAtIdx,
            } );
          }
        }
      } );
    }
  } );

  return { ...res, entities: [ entity ] };
};

const validateEntityV1JSON = ( json: never ) => {
  const res: {
    entity?: z.infer<typeof EntityUploadV1Schema>;
    errors?: Array<Record<string, string>>;
  } = {
    errors: undefined,
    entity: undefined,
  };

  try {
    res.entity = EntityUploadV1Schema.parse( json );
  } catch ( e ) {
    console.error( e );
    res.errors = [
      {
        message: "invalid json",
      },
    ];
  }

  return res;
};

const validateEntityCurrentJSON = ( json: never ) => {
  const res: {
    entities?: EntityInputType[];
    errors?: Array<Record<string, string>>;
  } = {
    errors: undefined,
    entities: undefined,
  };

  try {
    const currSchema = EntityUploadCurrentSchema.parse( json );
    res.entities = currSchema.entities;
  } catch ( e ) {
    console.error( e );
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
  entities: [
    {
      order: 0,
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
          order: 0,
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
  ],
};
