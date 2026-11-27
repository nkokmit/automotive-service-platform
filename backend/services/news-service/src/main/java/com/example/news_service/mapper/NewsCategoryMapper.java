package com.example.news_service.mapper;

import com.example.news_service.dto.response.NewsCategoryResponse;
import com.example.news_service.entity.NewsCategory;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface NewsCategoryMapper {

    NewsCategoryResponse toResponse(NewsCategory category);
}
