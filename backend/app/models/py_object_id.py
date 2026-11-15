from typing import Annotated, Any
from bson import ObjectId
from pydantic import GetCoreSchemaHandler
from pydantic_core import core_schema

class _PyObjectIdAnnotation:
    @classmethod
    def __get_pydantic_core_schema__(
        cls,
        _source_type: Any,
        _handler: GetCoreSchemaHandler,
    ) -> core_schema.CoreSchema:
        def validate(value: Any) -> ObjectId:
            if isinstance(value, ObjectId):
                return value
            if isinstance(value, str) and ObjectId.is_valid(value):
                return ObjectId(value)
            raise ValueError(f"Invalid ObjectId: {value}")

        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.no_info_after_validator_function(
                validate,
                core_schema.is_instance_schema(ObjectId) | core_schema.str_schema(),
            ),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

PyObjectId = Annotated[ObjectId, _PyObjectIdAnnotation]
